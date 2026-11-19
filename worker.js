import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { emailFrom, parseCount, unwrapLink, splitKeywords, inRange } from './parse.js';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, HEADLESS } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('Renseigne SUPABASE_URL et SUPABASE_SERVICE_KEY dans le fichier .env'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const dir = path.dirname(fileURLToPath(import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const log = (...a) => console.log(new Date().toLocaleTimeString('fr-FR'), ...a);

async function heartbeat() {
  await sb.from('settings').upsert({ key: 'worker_heartbeat', value: String(Date.now()) });
}
async function setJob(id, patch) {
  await sb.from('scrape_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
}
async function cancelled(id) {
  const { data } = await sb.from('scrape_jobs').select('status').eq('id', id).single();
  return data?.status === 'cancelled';
}
async function existingUrls() {
  const { data } = await sb.from('creators').select('url').not('url', 'is', null).limit(20000);
  return new Set((data || []).map(r => r.url));
}

class Stop extends Error {}

// ---------- TikTok ----------
async function waitCaptcha(page, job) {
  for (let i = 0; i < 40; i++) {
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 2000).toLowerCase()).catch(() => '');
    if (!/(captcha|vérif|verify|puzzle|slide to)/.test(txt)) return;
    if (i === 0) await setJob(job.id, { message: 'Vérification anti-robot : résous-la dans la fenêtre du navigateur.' });
    await sleep(3000);
  }
  throw new Stop('Vérification anti-robot non résolue.');
}


const ERR_RE = /(une erreur est survenue|something went wrong|réessayer plus tard|try again later)/i;
async function hasError(page) {
  const t = await page.evaluate(() => document.body.innerText.slice(0, 3000)).catch(() => '');
  return ERR_RE.test(t);
}
async function needsLogin(page) {
  return !!(await page.$('[data-e2e="nav-login-button"], [data-e2e="top-login-button"], button:has-text("Se connecter"), button:has-text("Log in")').catch(() => null));
}
async function ensureTikTok(page, url, job) {
  for (let i = 0; i < 3; i++) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(4000);
    await waitCaptcha(page, job);
    if (!(await hasError(page))) return;
    await sleep(3000 + i * 2000);
  }
  if (await needsLogin(page)) {
    await setJob(job.id, { message: 'TikTok bloque sans connexion : connecte-toi dans la fenêtre avec un compte secondaire. La session sera gardée.' });
    for (let i = 0; i < 600; i++) { await sleep(3000); if (!(await needsLogin(page))) break; }
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(4000);
    if (!(await hasError(page))) return;
  }
  throw new Stop('TikTok affiche une erreur pour ce hashtag (accès bloqué). Réessaie plus tard ou connecte-toi dans la fenêtre.');
}

async function collectLinks(page, handles) {
  for (let t = 0; t < 3; t++) {
    try {
      const hrefs = await page.$$eval('a[href*="/@"]', as => as.map(a => a.getAttribute('href')));
      for (const h of hrefs) { const m = (h || '').match(/\/@([\w.]+)/); if (m) handles.add(m[1]); }
      return;
    } catch { await sleep(2500); }
  }
}

async function tiktokHandles(page, tag, wanted, job) {
  const url = `https://www.tiktok.com/tag/${encodeURIComponent(tag)}`;
  await ensureTikTok(page, url, job);
  const handles = new Set();
  await sleep(5000);
  await collectLinks(page, handles);
  if (handles.size === 0) {
    // Rien d'affiché : probablement une connexion est demandée. On laisse la fenêtre ouverte.
    log(`#${tag} : aucune vidéo visible. Connecte-toi à TikTok dans la fenêtre (compte secondaire).`);
    await setJob(job.id, { message: `#${tag} : aucune vidéo visible → connecte-toi à TikTok dans la fenêtre ouverte (30 min max)` });
    const end = Date.now() + 1800000;
    while (Date.now() < end && handles.size === 0) {
      if (await cancelled(job.id)) throw new Stop('Annulé');
      await sleep(5000);
      await collectLinks(page, handles);
      if (handles.size === 0 && !page.url().includes('/tag/') && !page.url().includes('login')) {
        await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(4000);
      }
    }
    if (handles.size === 0) {
      await page.screenshot({ path: 'debug-tiktok.png' }).catch(() => {});
      throw new Stop(`TikTok n'affiche aucune vidéo pour #${tag} (connexion requise ?). Capture : worker/debug-tiktok.png`);
    }
  }
  for (let i = 0; i < 12 && handles.size < wanted; i++) {
    await page.mouse.wheel(0, 2500).catch(() => {});
    await sleep(rand(1500, 2800));
    await collectLinks(page, handles);
  }
  return [...handles];
}

async function tiktokProfile(page, handle, job) {
  await page.goto(`https://www.tiktok.com/@${handle}`, { waitUntil: 'domcontentloaded' });
  await sleep(rand(2000, 3500));
  await waitCaptcha(page, job);
  if (await hasError(page)) {
    await sleep(3000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(3500);
    if (await hasError(page)) return null;
  }
  const d = await page.evaluate(() => {
    const el = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
    if (el) {
      try {
        const info = JSON.parse(el.textContent)?.['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo;
        const u = info?.user, s = info?.stats || info?.statsV2;
        if (u) return { name: u.nickname, handle: u.uniqueId, bio: u.signature || '', link: u.bioLink?.link || '', followers: Number(s?.followerCount || 0) };
      } catch {}
    }
    const t = sel => document.querySelector(sel)?.textContent?.trim() || '';
    return { name: t('[data-e2e="user-subtitle"]'), handle: '', bio: t('[data-e2e="user-bio"]'), link: document.querySelector('[data-e2e="user-link"]')?.href || '', followers: t('[data-e2e="followers-count"]') };
  });
  if (!d || (!d.name && !d.followers)) return null;
  return { name: d.name || handle, handle, bio: d.bio, link: unwrapLink(d.link), followers: parseCount(d.followers), url: `https://www.tiktok.com/@${handle}` };
}

// ---------- Instagram (expérimental, nécessite d'être connecté) ----------
async function igFetch(page, url) {
  return page.evaluate(async u => {
    const r = await fetch(u, { headers: { 'x-ig-app-id': '936619743392459' }, credentials: 'include' });
    return { status: r.status, body: r.ok ? await r.json().catch(() => null) : null };
  }, url);
}
async function igEnsureLogin(page, job) {
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  for (let i = 0; i < 60; i++) {
    const needLogin = await page.$('input[name="username"]');
    if (!needLogin) return;
    if (i === 0) await setJob(job.id, { message: 'Connecte-toi à Instagram dans la fenêtre (utilise un compte secondaire).' });
    await sleep(3000);
  }
  throw new Stop('Connexion Instagram non effectuée.');
}
function collectUsernames(obj, out = new Set(), depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 12) return out;
  if (typeof obj.username === 'string' && /^[\w.]+$/.test(obj.username)) out.add(obj.username);
  for (const v of Object.values(obj)) collectUsernames(v, out, depth + 1);
  return out;
}
async function igHandles(page, tag) {
  const r = await igFetch(page, `https://www.instagram.com/api/v1/tags/web_info/?tag_name=${encodeURIComponent(tag)}`);
  if ([401, 403, 429].includes(r.status)) throw new Stop(`Instagram a répondu ${r.status} (limite atteinte ou session expirée). Réessaie plus tard.`);
  return r.body ? [...collectUsernames(r.body)] : [];
}
async function igProfile(page, handle) {
  const r = await igFetch(page, `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`);
  if ([401, 403, 429].includes(r.status)) throw new Stop(`Instagram a répondu ${r.status} (limite atteinte). Réessaie plus tard.`);
  const u = r.body?.data?.user;
  if (!u) return null;
  return { name: u.full_name || handle, handle, bio: u.biography || '', link: u.external_url || '', followers: u.edge_followed_by?.count || 0, email: u.business_email || '', url: `https://www.instagram.com/${handle}/` };
}

// ---------- Tâche ----------
async function runJob(job) {
  const tags = splitKeywords(job.query);
  const seen = await existingUrls();
  let found = 0, added = 0;
  const opts = { headless: HEADLESS === '1', viewport: { width: 1280, height: 860 }, locale: 'fr-FR' };
  let ctx;
  try { ctx = await chromium.launchPersistentContext(path.join(dir, 'browser-profile-chrome'), { ...opts, channel: 'chrome' }); }
  catch { log('Chrome introuvable, utilisation de Chromium.'); ctx = await chromium.launchPersistentContext(path.join(dir, 'browser-profile'), opts); }
  const page = ctx.pages()[0] || await ctx.newPage();
  try {
    if (job.platform === 'instagram') await igEnsureLogin(page, job);
    const perTag = Math.max(10, Math.ceil(job.max_results / tags.length) * 3);
    for (const tag of tags) {
      if (added >= job.max_results) break;
      await setJob(job.id, { message: `Recherche de #${tag}…` });
      const handles = job.platform === 'tiktok' ? await tiktokHandles(page, tag, perTag, job) : await igHandles(page, tag);
      log(`#${tag} : ${handles.length} profils candidats`);
      for (const h of handles) {
        if (added >= job.max_results) break;
        if (await cancelled(job.id)) throw new Stop('Annulé');
        const url = job.platform === 'tiktok' ? `https://www.tiktok.com/@${h}` : `https://www.instagram.com/${h}/`;
        if (seen.has(url)) continue;
        seen.add(url);
        const p = job.platform === 'tiktok' ? await tiktokProfile(page, h, job) : await igProfile(page, h);
        found++;
        if (p && inRange(p.followers, job.min_followers, job.max_followers)) {
          const { error } = await sb.from('creators').insert({
            name: p.name, platform: job.platform, url: p.url, email: p.email || emailFrom(p.bio) || null,
            website: p.link || null, niche: tag, audience: p.followers, notes: (p.bio || '').slice(0, 300) || null,
          });
          if (!error) added++; else log('Insertion impossible :', error.message);
        }
        await setJob(job.id, { found, added, message: `#${tag} · ${added}/${job.max_results} ajoutés` });
        await sleep(job.platform === 'instagram' ? rand(5000, 9000) : rand(1800, 4000));
      }
    }
    await setJob(job.id, { status: 'done', found, added, message: `Terminé : ${added} créateurs ajoutés.` });
  } catch (e) {
    const stopped = e instanceof Stop;
    await setJob(job.id, { status: stopped && e.message === 'Annulé' ? 'cancelled' : 'error', found, added, message: stopped ? e.message : `Erreur : ${e.message}`.slice(0, 300) });
    log('Fin de tâche :', e.message);
  } finally {
    await sleep(120000);
    await ctx.close().catch(() => {});
  }
}

async function main() {
  log('Worker CreatorFlow démarré. En attente de tâches… (Ctrl+C pour arrêter)');
  setInterval(() => heartbeat().catch(() => {}), 10000);
  await heartbeat().catch(e => { console.error('Connexion Supabase impossible :', e.message); });
  for (;;) {
    const { data } = await sb.from('scrape_jobs').select('*').eq('status', 'pending').order('id').limit(1);
    const job = data?.[0];
    if (!job) { await sleep(5000); continue; }
    const { data: claimed } = await sb.from('scrape_jobs').update({ status: 'running', message: 'Démarrage…' }).eq('id', job.id).eq('status', 'pending').select();
    if (!claimed?.length) continue;
    log(`Tâche #${job.id} (${job.platform}) : ${job.query.replace(/\n/g, ', ')}`);
    await runJob(job);
  }
}
main();

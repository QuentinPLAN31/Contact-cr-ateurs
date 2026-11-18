import { safe } from '@/lib/api';
import { sb, must, getSettings } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { mapItem, EMAIL_RE } from '@/lib/discover';
const bad = (error, status = 400) => Response.json({ error }, { status });

async function _GET(req) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get('q'), platform = sp.get('platform') || 'youtube';
  if (!q) return Response.json({ items: [] });
  const items = platform === 'youtube' ? await youtube(q) : await apify(platform, q);
  if (items.error) return bad(items.error);
  const rows = await must(sb().from('creators').select('url').not('url', 'is', null).limit(20000));
  const have = new Set(rows.map(r => r.url));
  return Response.json({ items: items.map(i => ({ ...i, added: have.has(i.url) })).sort((a, b) => b.audience - a.audience) });
}

async function youtube(q) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { error: 'Variable YOUTUBE_API_KEY manquante.' };
  const s = await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=20&q=${encodeURIComponent(q)}&key=${key}`)).json();
  if (s.error) return { error: s.error.message };
  const ids = (s.items || []).map(i => i.snippet.channelId).filter(Boolean);
  if (!ids.length) return [];
  const c = await (await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids.join(',')}&key=${key}`)).json();
  return (c.items || []).map(ch => ({
    name: ch.snippet.title, url: `https://www.youtube.com/channel/${ch.id}`, platform: 'youtube', niche: q,
    audience: ch.statistics.hiddenSubscriberCount ? 0 : parseInt(ch.statistics.subscriberCount || '0', 10),
    email: (ch.snippet.description.match(EMAIL_RE) || [''])[0],
  }));
}


async function apify(platform, q) {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { error: 'Variable APIFY_TOKEN manquante (compte Apify gratuit).' };
  const s = await getSettings();
  const actor = (s[`apify_${platform}_actor`] || '').trim();
  if (!actor) return { error: `Renseigne l’acteur Apify pour ${platform} dans Réglages.` };
  let input;
  try { input = JSON.parse((s[`apify_${platform}_input`] || '{}').replace(/{{q}}/g, q.replace(/"/g, ''))); }
  catch { return { error: 'Le JSON d’entrée de l’acteur est invalide (Réglages).' }; }
  const r = await fetch(`https://api.apify.com/v2/acts/${actor.replace('/', '~')}/run-sync-get-dataset-items?token=${token}&timeout=45`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!r.ok) return { error: `Apify a répondu ${r.status}. Vérifie l’acteur, le token ou réduis le nombre de résultats.` };
  const data = await r.json();
  const map = new Map();
  for (const it of Array.isArray(data) ? data : []) {
    const m = mapItem(platform, it, q);
    if (m.name && m.url && !map.has(m.url)) map.set(m.url, m);
  }
  return [...map.values()];
}
export const GET = safe(_GET);

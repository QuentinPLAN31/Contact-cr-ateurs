import nodemailer from 'nodemailer';
import { sb, must, getSettings } from './db';

export function render(tpl, vars) {
  return (tpl || '').replace(/{{\s*(\w+)\s*}}/g, (_, k) => vars[k] ?? '');
}

export function varsFor(c, s) {
  const first = (c.name || '').trim().split(/\s+/)[0] || '';
  return { prenom: first, chaine: c.name || '', plateforme: c.platform || '', produit: s.product_name || '', lien: s.product_url || '', expediteur: s.sender_name || '' };
}

export async function sentToday() {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  const { count } = await sb().from('messages').select('id', { count: 'exact', head: true }).eq('ok', true).gte('sent_at', d.toISOString());
  return count || 0;
}

export function checkConfig(s) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return 'Variables GMAIL_USER et GMAIL_APP_PASSWORD manquantes (Vercel > Settings > Environment Variables).';
  if (!s.product_name || !s.sender_name) return 'Renseigne le nom du produit et ton nom d’expéditeur dans Réglages.';
  return null;
}

async function getStep(step) {
  const rows = await must(sb().from('sequence').select('*').eq('step', step));
  return rows[0];
}

export async function sendStep(creatorId, step, opts = {}) {
  const s = await getSettings();
  const err = checkConfig(s);
  if (err) return { ok: false, error: err };
  const tpl = await getStep(step);
  if (!tpl) return { ok: false, error: 'Étape inexistante' };
  let c;
  if (opts.test) c = { id: 0, name: 'Alex Test', platform: 'youtube', email: process.env.GMAIL_USER };
  else c = (await must(sb().from('creators').select('*').eq('id', creatorId)))[0];
  if (!c) return { ok: false, error: 'Créateur introuvable' };
  if (!c.email) return { ok: false, error: 'Pas d’email' };
  const v = varsFor(c, s);
  const subject = render(tpl.subject, v);
  const body = render(tpl.body, v) + (s.footer ? `\n\n--\n${s.footer}` : '');
  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
    await t.sendMail({ from: `"${s.sender_name}" <${process.env.GMAIL_USER}>`, to: c.email, subject, text: body });
    if (!opts.test) await logSent(c, step, 'email', subject, body);
    return { ok: true };
  } catch (e) {
    if (!opts.test) await sb().from('messages').insert({ creator_id: c.id, step, channel: 'email', subject, body, ok: false, error: String(e.message || e) });
    return { ok: false, error: String(e.message || e) };
  }
}

export async function logSent(c, step, channel, subject, body) {
  await must(sb().from('messages').insert({ creator_id: c.id, step, channel, subject, body, ok: true }));
  await must(sb().from('creators').update({ step, last_sent_at: new Date().toISOString(), status: c.status && c.status !== 'new' ? c.status : 'contacted' }).eq('id', c.id));
}

export async function dueFollowups() {
  const seq = await must(sb().from('sequence').select('*').order('step'));
  const rows = await must(sb().from('creators').select('*').eq('status', 'contacted').not('last_sent_at', 'is', null));
  const out = { email: [], dm: [] };
  for (const c of rows) {
    const next = seq.find(x => x.step === c.step + 1);
    if (!next) continue;
    const days = (Date.now() - new Date(c.last_sent_at).getTime()) / 86400000;
    if (days < next.delay_days) continue;
    const item = { id: c.id, name: c.name, platform: c.platform, email: c.email, step: next.step };
    (c.email ? out.email : out.dm).push(item);
  }
  return out;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

import { createClient } from '@supabase/supabase-js';

export function sb() {
  const g = globalThis;
  if (!g.__sb) {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définies dans les variables d’environnement.');
    g.__sb = createClient(url, key, { auth: { persistSession: false } });
  }
  return g.__sb;
}

export const STATUSES = ['new', 'contacted', 'replied', 'negotiating', 'signed', 'published', 'declined'];

export async function must(q) {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function getSettings() {
  const rows = await must(sb().from('settings').select('key,value'));
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function addCreators(list) {
  const existing = await must(sb().from('creators').select('email,url').limit(20000));
  const emails = new Set(existing.map(e => (e.email || '').toLowerCase()).filter(Boolean));
  const urls = new Set(existing.map(e => e.url).filter(Boolean));
  const rows = []; let skipped = 0;
  for (const c of list) {
    const name = (c.name || '').trim();
    const email = (c.email || '').trim() || null;
    const url = (c.url || '').trim() || null;
    if (!name || (email && emails.has(email.toLowerCase())) || (url && urls.has(url))) { skipped++; continue; }
    if (email) emails.add(email.toLowerCase());
    if (url) urls.add(url);
    rows.push({ website: (c.website || '').trim() || null, name, platform: (c.platform || 'youtube').toLowerCase(), url, email, niche: (c.niche || '').trim() || null, audience: parseInt(c.audience, 10) || 0, notes: (c.notes || '').trim() || null });
  }
  if (rows.length) await must(sb().from('creators').insert(rows));
  return { added: rows.length, skipped };
}

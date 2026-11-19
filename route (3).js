import { safe } from '@/lib/api';
import { sb, must } from '@/lib/db';
export const dynamic = 'force-dynamic';

async function _GET() {
  const jobs = await must(sb().from('scrape_jobs').select('*').order('id', { ascending: false }).limit(20));
  const hb = await must(sb().from('settings').select('value').eq('key', 'worker_heartbeat'));
  const last = hb[0] ? parseInt(hb[0].value, 10) : 0;
  return Response.json({ jobs, online: Date.now() - last < 40000, lastSeen: last });
}
async function _POST(req) {
  const b = await req.json();
  if (!['tiktok', 'instagram'].includes(b.platform)) return Response.json({ error: 'Plateforme non supportée' }, { status: 400 });
  if (!String(b.query || '').trim()) return Response.json({ error: 'Ajoute au moins un mot-clé ou hashtag' }, { status: 400 });
  await must(sb().from('scrape_jobs').insert({
    platform: b.platform, query: String(b.query).trim(),
    min_followers: parseInt(b.min_followers, 10) || 0, max_followers: parseInt(b.max_followers, 10) || 0,
    max_results: Math.min(parseInt(b.max_results, 10) || 50, 300),
  }));
  return Response.json({ ok: true });
}
async function _PATCH(req) {
  const { id, status } = await req.json();
  if (status === 'cancelled') await must(sb().from('scrape_jobs').update({ status, message: 'Annulé', updated_at: new Date().toISOString() }).eq('id', id).in('status', ['pending', 'running']));
  return Response.json({ ok: true });
}
export const GET = safe(_GET);
export const POST = safe(_POST);
export const PATCH = safe(_PATCH);

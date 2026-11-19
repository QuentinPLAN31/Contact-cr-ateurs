import { safe } from '@/lib/api';
import { sb, must, getSettings } from '@/lib/db';
import { render, varsFor, logSent } from '@/lib/mail';
export const dynamic = 'force-dynamic';

async function load(id, step) {
  const c = (await must(sb().from('creators').select('*').eq('id', id)))[0];
  const t = (await must(sb().from('sequence').select('*').eq('step', step)))[0];
  return { c, t };
}
async function _GET(req) {
  const sp = new URL(req.url).searchParams;
  const { c, t } = await load(sp.get('id'), parseInt(sp.get('step'), 10));
  if (!c || !t) return Response.json({ error: 'Introuvable' }, { status: 404 });
  const s = await getSettings();
  return Response.json({ name: c.name, platform: c.platform, url: c.url, text: render(t.body, varsFor(c, s)) });
}
async function _POST(req) {
  const { id, step } = await req.json();
  const { c, t } = await load(id, step);
  if (!c || !t) return Response.json({ error: 'Introuvable' }, { status: 404 });
  const s = await getSettings();
  await logSent(c, step, 'dm', '', render(t.body, varsFor(c, s)));
  return Response.json({ ok: true });
}
export const GET = safe(_GET);
export const POST = safe(_POST);

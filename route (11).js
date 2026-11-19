import { safe } from '@/lib/api';
import { sb, must, addCreators } from '@/lib/db';
export const dynamic = 'force-dynamic';

async function _GET() {
  return Response.json(await must(sb().from('creators').select('*').order('id', { ascending: false }).limit(5000)));
}
async function _POST(req) {
  const b = await req.json();
  return Response.json(await addCreators(b.items || [b]));
}
async function _PATCH(req) {
  const { id, ...f } = await req.json();
  const allowed = ['name', 'platform', 'url', 'email', 'niche', 'audience', 'status', 'notes', 'website'];
  const upd = {};
  for (const k of Object.keys(f)) if (allowed.includes(k)) upd[k] = f[k] === '' ? null : f[k];
  if (Object.keys(upd).length) await must(sb().from('creators').update(upd).eq('id', id));
  return Response.json({ ok: true });
}
async function _DELETE(req) {
  const id = new URL(req.url).searchParams.get('id');
  await must(sb().from('creators').delete().eq('id', id));
  return Response.json({ ok: true });
}
export const GET = safe(_GET);
export const POST = safe(_POST);
export const PATCH = safe(_PATCH);
export const DELETE = safe(_DELETE);

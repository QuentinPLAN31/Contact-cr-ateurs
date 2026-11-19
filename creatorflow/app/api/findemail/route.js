import { safe } from '@/lib/api';
import { sb, must } from '@/lib/db';
import { findEmail } from '@/lib/findemail';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function _GET(req) {
  const id = new URL(req.url).searchParams.get('id');
  const c = (await must(sb().from('creators').select('*').eq('id', id)))[0];
  if (!c) return Response.json({ error: 'Créateur introuvable' }, { status: 404 });
  if (!c.website) return Response.json({ error: 'Pas de site / lien de bio renseigné' });
  const r = await findEmail(c.website);
  if (r.best && !c.email) await must(sb().from('creators').update({ email: r.best }).eq('id', c.id));
  return Response.json(r);
}
export const GET = safe(_GET);

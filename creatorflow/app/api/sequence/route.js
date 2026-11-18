import { safe } from '@/lib/api';
import { sb, must } from '@/lib/db';
export const dynamic = 'force-dynamic';

async function _GET() {
  return Response.json(await must(sb().from('sequence').select('*').order('step')));
}
async function _PUT(req) {
  const steps = await req.json();
  await must(sb().from('sequence').delete().gte('step', 0));
  if (steps.length) await must(sb().from('sequence').insert(steps.map((s, i) => ({ step: i + 1, delay_days: parseInt(s.delay_days, 10) || 0, subject: s.subject || '', body: s.body || '' }))));
  return Response.json({ ok: true });
}
export const GET = safe(_GET);
export const PUT = safe(_PUT);

import { safe } from '@/lib/api';
import { dueFollowups, sendStep, sentToday, sleep } from '@/lib/mail';
import { getSettings } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function _GET() {
  const d = await dueFollowups();
  return Response.json({ ...d, sentToday: await sentToday() });
}
// Envoie jusqu'à 5 relances par appel ; renvoie ce qui reste à envoyer.
async function _POST() {
  const s = await getSettings();
  const cap = parseInt(s.daily_cap || '30', 10);
  let left = Math.max(0, cap - (await sentToday()));
  const { email } = await dueFollowups();
  const results = { sent: 0, failed: 0, blocked: 0, remaining: 0, errors: [] };
  const batch = email.slice(0, 5);
  for (const d of batch) {
    if (left <= 0) { results.blocked++; continue; }
    const r = await sendStep(d.id, d.step);
    if (r.ok) { results.sent++; left--; } else { results.failed++; results.errors.push(r.error); }
    await sleep(800 + Math.random() * 800);
  }
  results.remaining = Math.max(0, email.length - results.sent);
  return Response.json(results);
}
export const GET = safe(_GET);
export const POST = safe(_POST);

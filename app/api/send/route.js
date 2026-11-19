import { safe } from '@/lib/api';
import { sendStep, sentToday, sleep } from '@/lib/mail';
import { getSettings } from '@/lib/db';
export const maxDuration = 60;

// Traite un petit lot (le client enchaîne les lots) pour rester sous la limite de durée de Vercel.
async function _POST(req) {
  const { ids = [], step = 1, test = false } = await req.json();
  if (test) return Response.json(await sendStep(0, step, { test: true }));
  const s = await getSettings();
  const cap = parseInt(s.daily_cap || '30', 10);
  let left = Math.max(0, cap - (await sentToday()));
  const results = { sent: 0, failed: 0, blocked: 0, errors: [] };
  for (const id of ids.slice(0, 5)) {
    if (left <= 0) { results.blocked++; continue; }
    const r = await sendStep(id, step);
    if (r.ok) { results.sent++; left--; } else { results.failed++; results.errors.push(r.error); }
    await sleep(800 + Math.random() * 800);
  }
  return Response.json(results);
}
export const POST = safe(_POST);

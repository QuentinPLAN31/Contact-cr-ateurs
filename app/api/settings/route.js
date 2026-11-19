import { safe } from '@/lib/api';
import { sb, must, getSettings } from '@/lib/db';
export const dynamic = 'force-dynamic';

const ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'APP_PASSWORD', 'GMAIL_USER', 'GMAIL_APP_PASSWORD', 'YOUTUBE_API_KEY', 'APIFY_TOKEN'];

async function _GET() {
  let settings = {}, dbError = null;
  try { settings = await getSettings(); } catch (e) { dbError = String(e.message || e); }
  return Response.json({ settings, dbError, env: Object.fromEntries(ENV.map(k => [k, !!process.env[k]])) });
}
async function _PUT(req) {
  const b = await req.json();
  const rows = Object.entries(b).map(([key, value]) => ({ key, value: String(value ?? '') }));
  if (rows.length) await must(sb().from('settings').upsert(rows));
  return Response.json({ ok: true });
}
export const GET = safe(_GET);
export const PUT = safe(_PUT);

import crypto from 'crypto';
import { sleep } from '@/lib/mail';

export async function POST(req) {
  const { password } = await req.json();
  const pw = process.env.APP_PASSWORD;
  if (!pw) return Response.json({ error: 'APP_PASSWORD n’est pas défini sur le serveur.' }, { status: 500 });
  const a = crypto.createHash('sha256').update(String(password || '')).digest();
  const b = crypto.createHash('sha256').update(pw).digest();
  if (!crypto.timingSafeEqual(a, b)) { await sleep(800); return Response.json({ error: 'Mot de passe incorrect' }, { status: 401 }); }
  const token = crypto.createHash('sha256').update(pw + ':cf').digest('hex');
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie', `cf_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return res;
}

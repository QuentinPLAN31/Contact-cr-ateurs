import { NextResponse } from 'next/server';

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login')) return NextResponse.next();
  const pw = process.env.APP_PASSWORD;
  const tok = req.cookies.get('cf_auth')?.value;
  if (pw && tok === (await sha(pw + ':cf'))) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };

import dns from 'dns/promises';
import net from 'net';

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const JUNK = /(\.(png|jpe?g|gif|svg|webp|css|js)$)|sentry|wixpress|example\.|domain\.com|email\.com|yourname|@2x|noreply|no-reply|u00/i;
const PRO = /(business|contact|collab|pro|partner|hello|booking|press|sponsor|work|mgmt|manage)/i;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const l = ip.toLowerCase();
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:');
}

async function safeUrl(u, opts) {
  let url;
  try { url = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (!opts.allowPrivate) {
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) return null;
    try {
      const addrs = await dns.lookup(url.hostname, { all: true });
      if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) return null;
    } catch { return null; }
  }
  return url;
}

async function getHtml(u, opts, hops = 0) {
  const url = await safeUrl(u, opts);
  if (!url || hops > 3) return null;
  try {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(7000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CreatorFlow/1.0)', Accept: 'text/html' } });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) return getHtml(new URL(r.headers.get('location'), url).toString(), opts, hops + 1);
    if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return null;
    return { html: (await r.text()).slice(0, 1_500_000), url };
  } catch { return null; }
}

function extract(html) {
  const found = new Set();
  const dec = html.replace(/&#64;|&commat;|\[at\]|\(at\)|%40/gi, '@').replace(/\\u0040/g, '@');
  for (const m of dec.match(EMAIL_RE) || []) { const e = m.replace(/^mailto:/i, '').toLowerCase(); if (!JUNK.test(e)) found.add(e); }
  return found;
}

export async function findEmail(website, opts = {}) {
  const first = await getHtml(website, opts);
  if (!first) return { emails: [], best: null, error: 'Site inaccessible' };
  const all = new Set(extract(first.html));
  if (!all.size) {
    const links = [...first.html.matchAll(/href=["']([^"'#]+)["']/gi)].map(m => m[1])
      .filter(h => /(contact|about|a-propos|apropos|business|collab|press)/i.test(h))
      .map(h => { try { return new URL(h, first.url).toString(); } catch { return null; } })
      .filter(h => h && new URL(h).origin === first.url.origin);
    for (const l of [...new Set(links)].slice(0, 2)) {
      const p = await getHtml(l, opts);
      if (p) extract(p.html).forEach(e => all.add(e));
      if (all.size) break;
    }
  }
  const emails = [...all];
  const best = emails.find(e => PRO.test(e.split('@')[0])) || emails[0] || null;
  return { emails, best };
}

export function firstWebsite(text) {
  const urls = (text || '').match(/https?:\/\/[^\s)>"']+/g) || [];
  return urls.find(u => !/(youtube\.com|youtu\.be|google\.com|instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com|discord\.gg)/i.test(u)) || '';
}

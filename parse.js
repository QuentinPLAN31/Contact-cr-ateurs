const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

export const emailFrom = text => ((text || '').match(EMAIL_RE) || [''])[0].toLowerCase();

// "12.3K" -> 12300, "1,2M" -> 1200000, "845" -> 845
export function parseCount(v) {
  if (typeof v === 'number') return Math.round(v);
  const m = String(v || '').trim().replace(/\s/g, '').match(/^([\d.,]+)([KkMmBb])?$/);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(',', '.'));
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1;
  return Math.round(n * mult);
}

// Les liens de bio TikTok passent par une redirection : on récupère la vraie cible.
export function unwrapLink(u) {
  if (!u) return '';
  try {
    const url = new URL(u);
    const t = url.searchParams.get('target');
    return t ? decodeURIComponent(t) : u;
  } catch { return u; }
}

export function splitKeywords(q) {
  return [...new Set(String(q || '').split(/[\n,]+/).map(s => s.trim().replace(/^#/, '')).filter(Boolean))];
}

export const inRange = (n, min, max) => n >= (min || 0) && (!max || n <= max);

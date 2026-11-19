import { firstWebsite } from './findemail';
export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export function mapItem(platform, it, q) {
  const a = it.authorMeta || it.author || {};
  const handle = a.name || it.ownerUsername || it.username || it.userName || it.handle || '';
  const name = a.nickName || it.ownerFullName || it.fullName || it.name || handle;
  let url = '';
  if (handle && platform === 'tiktok') url = `https://www.tiktok.com/@${handle}`;
  else if (handle && platform === 'instagram') url = `https://www.instagram.com/${handle}/`;
  else if (handle && platform === 'x') url = `https://x.com/${handle}`;
  else url = a.profileUrl || it.profileUrl || it.linkedinUrl || it.url || '';
  const bio = a.signature || it.biography || it.bio || it.headline || it.description || '';
  const email = it.email || it.businessEmail || (Array.isArray(it.emails) && it.emails[0]) || (String(bio).match(EMAIL_RE) || [''])[0];
  const audience = parseInt(a.fans ?? it.followersCount ?? it.followers ?? it.followerCount ?? 0, 10) || 0;
  const website = it.externalUrl || it.website || it.bioLink?.link || it.bioLink?.url || (Array.isArray(it.externalUrls) && it.externalUrls[0]?.url) || a.bioLink || firstWebsite(bio) || '';
  return { name, url, platform, niche: q, audience, email: email || '', website: typeof website === 'string' ? website : '' };
}

import { safe } from '@/lib/api';
import Papa from 'papaparse';
import { addCreators } from '@/lib/db';

async function _POST(req) {
  const { csv } = await req.json();
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase() });
  const pick = (r, ...keys) => { for (const k of keys) if (r[k]) return r[k]; return ''; };
  const list = data.map(r => ({
    name: pick(r, 'name', 'nom', 'chaine', 'channel'),
    email: pick(r, 'email', 'mail'),
    url: pick(r, 'url', 'lien', 'link'),
    niche: pick(r, 'niche', 'categorie', 'category'),
    audience: pick(r, 'audience', 'abonnes', 'followers', 'subscribers'),
    platform: pick(r, 'platform', 'plateforme') || 'youtube',
  }));
  return Response.json(await addCreators(list));
}
export const POST = safe(_POST);

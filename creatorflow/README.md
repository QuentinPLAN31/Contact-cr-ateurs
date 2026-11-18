# CreatorFlow (MVP)

Trouve et contacte des créateurs (YouTube, TikTok, Instagram, LinkedIn, X…). Next.js + Supabase, déployable sur Vercel (offre gratuite).

## Déploiement
1. **Supabase** : crée un projet, ouvre SQL Editor, colle le contenu de `supabase.sql`, Run.
2. **GitHub** : crée un dépôt privé et pousse ce dossier (`git init`, `git add .`, `git commit`, `git push`).
3. **Vercel** : New Project → importe le dépôt → ajoute les variables ci-dessous → Deploy.

## Variables d'environnement (Vercel > Settings > Environment Variables)
| Variable | Contenu |
|---|---|
| SUPABASE_URL | URL du projet (Supabase > Project Settings > API) |
| SUPABASE_SERVICE_KEY | clé `service_role` (secrète, ne jamais la mettre côté client) |
| APP_PASSWORD | mot de passe d'accès à l'app |
| GMAIL_USER | adresse Gmail d'envoi |
| GMAIL_APP_PASSWORD | mot de passe d'application Gmail (2FA requise) |
| YOUTUBE_API_KEY | clé YouTube Data API v3 (optionnel) |
| APIFY_TOKEN | token Apify (optionnel, pour TikTok/Instagram/LinkedIn/X) |

Puis ouvre l'app, connecte-toi, et remplis l'onglet Réglages (nom, produit, acteurs Apify).

## En local
`npm install`, crée un fichier `.env.local` avec les variables ci-dessus, puis `npm run dev`.

## Palettes
Les ronds en haut à droite changent la palette. Les couleurs sont dans `app/globals.css`.

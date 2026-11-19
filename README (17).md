# Worker CreatorFlow (à lancer sur ton PC)

Il récupère les tâches créées dans l'onglet **Collecte** de l'app et remplit ta liste de créateurs.

## Installation (une seule fois), dans ce dossier `worker`
```
npm install
npx playwright install chromium
copy .env.example .env
```
Ouvre `.env` et remplis `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` (les mêmes valeurs que sur Vercel). Ne partage jamais ce fichier.

## Utilisation
```
npm start
```
Laisse la fenêtre ouverte : l'onglet Collecte affiche « Worker connecté ». Lance une collecte depuis l'app ; un navigateur s'ouvre sur ton PC et travaille tout seul.

- **TikTok** : si une vérification anti-robot apparaît, résous-la dans la fenêtre.
- **Instagram** (expérimental) : connecte-toi dans la fenêtre avec un **compte secondaire**. La session est gardée dans `browser-profile`.
- Garde des volumes raisonnables (quelques dizaines à quelques centaines de profils par jour) pour limiter les blocages.

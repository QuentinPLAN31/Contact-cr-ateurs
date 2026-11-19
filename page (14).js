'use client';
import { useEffect, useState } from 'react';
import { LABELS } from '@/lib/platforms';

const BASE = [
  ['sender_name', 'Ton nom (expéditeur)'],
  ['product_name', 'Nom de ton produit'],
  ['product_url', 'Lien du produit'],
  ['daily_cap', 'Plafond d’emails par jour'],
  ['footer', 'Mention de désinscription (bas des emails)'],
];
const APIFY = ['tiktok', 'instagram', 'linkedin', 'x'];
const ENV_HELP = {
  SUPABASE_URL: 'URL du projet Supabase', SUPABASE_SERVICE_KEY: 'clé service_role Supabase', APP_PASSWORD: 'mot de passe d’accès à l’app',
  GMAIL_USER: 'adresse Gmail d’envoi', GMAIL_APP_PASSWORD: 'mot de passe d’application Gmail', YOUTUBE_API_KEY: 'clé YouTube Data API v3', APIFY_TOKEN: 'token Apify (TikTok, Instagram, LinkedIn, X)',
};

export default function Settings() {
  const [s, setS] = useState({});
  const [env, setEnv] = useState({});
  const [msg, setMsg] = useState('');
  const [dbError, setDbError] = useState('');
  useEffect(() => { fetch('/api/settings').then(r => r.json()).then(r => { setS(r.settings || {}); setEnv(r.env || {}); setDbError(r.dbError || ''); }); }, []);
  const save = async e => {
    e.preventDefault();
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    setMsg('Réglages enregistrés.');
  };
  const set = (k, v) => setS({ ...s, [k]: v });
  return (
    <>
      <h1>Réglages</h1>
      {msg && <div className="msg">{msg}</div>}
      {dbError && <div className="msg err">Base de données : {dbError}</div>}
      <form onSubmit={save}>
        <div className="card">
          <h2>Général</h2>
          <div className="grid2">{BASE.map(([k, l]) => <div key={k}><label>{l}</label><input value={s[k] || ''} onChange={e => set(k, e.target.value)} /></div>)}</div>
        </div>
        <div className="card">
          <h2>Connecteurs Apify</h2>
          <p className="muted" style={{ marginTop: 0 }}>Nom de l’acteur Apify (ex : utilisateur/acteur) et son JSON d’entrée. {'{{q}}'} est remplacé par ton mot-clé.</p>
          {APIFY.map(p => (
            <div key={p} className="row" style={{ marginBottom: 10 }}>
              <div style={{ flex: '0 0 90px' }}><b>{LABELS[p]}</b></div>
              <div><label>Acteur</label><input value={s[`apify_${p}_actor`] || ''} onChange={e => set(`apify_${p}_actor`, e.target.value)} /></div>
              <div><label>Entrée JSON</label><input value={s[`apify_${p}_input`] || ''} onChange={e => set(`apify_${p}_input`, e.target.value)} /></div>
            </div>
          ))}
        </div>
        <button className="btn">Enregistrer</button>
      </form>
      <div className="card" style={{ marginTop: 18 }}>
        <h2>Variables d’environnement (Vercel)</h2>
        <p className="muted" style={{ marginTop: 0 }}>Les secrets ne sont jamais stockés dans la base. Ajoute-les dans Vercel → Settings → Environment Variables.</p>
        {Object.entries(ENV_HELP).map(([k, h]) => (
          <div key={k} style={{ padding: '4px 0' }}><span className={env[k] ? 'okc' : 'err'}>{env[k] ? '✓' : '✗'}</span> <code>{k}</code> <span className="muted">· {h}</span></div>
        ))}
        <p className="muted">Gmail : Sécurité du compte Google → validation en 2 étapes → « Mots de passe des applications ». YouTube : console.cloud.google.com → activer YouTube Data API v3 → Clé API.</p>
      </div>
    </>
  );
}

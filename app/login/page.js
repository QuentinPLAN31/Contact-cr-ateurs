'use client';
import { useState } from 'react';

export default function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const go = async e => {
    e.preventDefault();
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (r.ok) window.location.href = '/'; else setErr((await r.json()).error);
  };
  return (
    <form className="card" onSubmit={go} style={{ maxWidth: 380, margin: '80px auto' }}>
      <h1>Connexion</h1>
      <label style={{ marginTop: 14 }}>Mot de passe</label>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
      {err && <p className="err">{err}</p>}
      <div style={{ marginTop: 14 }}><button className="btn">Entrer</button></div>
    </form>
  );
}

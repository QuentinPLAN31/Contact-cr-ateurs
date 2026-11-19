'use client';
import { useEffect, useState } from 'react';

export default function Sequence() {
  const [steps, setSteps] = useState([]);
  const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/sequence').then(r => r.json()).then(setSteps); }, []);

  const upd = (i, f) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...f } : s)));
  const save = async () => {
    await fetch('/api/sequence', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(steps) });
    setMsg('Séquence enregistrée.');
  };
  const test = async i => {
    await save(); setMsg('Envoi du test à ton Gmail…');
    const r = await (await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: true, step: i + 1 }) })).json();
    setMsg(r.ok ? 'Test envoyé sur ta boîte Gmail.' : 'Échec : ' + r.error);
  };

  return (
    <>
      <h1>Séquence</h1>
      <p className="muted">Variables : {'{{prenom}} {{chaine}} {{produit}} {{lien}} {{expediteur}}'}. Une mention de désinscription est ajoutée automatiquement (Réglages).</p>
      {msg && <div className="msg">{msg}</div>}
      {steps.map((s, i) => (
        <div className="card" key={i}>
          <div className="row">
            <h2 style={{ margin: 0, flex: '1 1 auto' }}>Étape {i + 1}</h2>
            <div className="fit" style={{ width: 170 }}>
              <label>{i === 0 ? 'Envoi immédiat' : 'Délai (jours après l’étape précédente)'}</label>
              <input type="number" min="0" disabled={i === 0} value={s.delay_days} onChange={e => upd(i, { delay_days: e.target.value })} />
            </div>
          </div>
          <label style={{ marginTop: 10 }}>Objet</label>
          <input value={s.subject} onChange={e => upd(i, { subject: e.target.value })} />
          <label style={{ marginTop: 10 }}>Message</label>
          <textarea value={s.body} onChange={e => upd(i, { body: e.target.value })} />
          <div className="row" style={{ marginTop: 10 }}>
            <div className="fit"><button className="btn ghost sm" onClick={() => test(i)}>M’envoyer un test</button></div>
            {i === steps.length - 1 && i > 0 && <div className="fit"><button className="btn danger sm" onClick={() => setSteps(steps.slice(0, -1))}>Supprimer l’étape</button></div>}
          </div>
        </div>
      ))}
      <div className="row">
        <div className="fit"><button className="btn ghost" onClick={() => setSteps([...steps, { delay_days: 4, subject: 'Re: ', body: '' }])}>+ Ajouter une relance</button></div>
        <div className="fit"><button className="btn" onClick={save}>Enregistrer</button></div>
      </div>
    </>
  );
}

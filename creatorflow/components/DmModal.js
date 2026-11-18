'use client';
import { useEffect, useState } from 'react';

export default function DmModal({ creator, step, onClose, onDone }) {
  const [d, setD] = useState(null);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch(`/api/dm?id=${creator.id}&step=${step}`).then(r => r.json()).then(x => { setD(x); setText(x.text || ''); });
  }, [creator.id, step]);
  const copy = async () => { await navigator.clipboard.writeText(text); setCopied(true); };
  const done = async () => {
    await fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: creator.id, step }) });
    onDone && onDone(); onClose();
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'grid', placeItems: 'center', zIndex: 20, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 'min(560px, 100%)', margin: 0 }} onClick={e => e.stopPropagation()}>
        <h2>DM · {creator.name} · étape {step}</h2>
        {!d ? <p className="muted">Chargement…</p> : d.error ? <p className="err">{d.error}</p> : (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} />
            <div className="row" style={{ marginTop: 12 }}>
              <div className="fit"><button className="btn ghost" onClick={copy}>{copied ? 'Copié ✓' : 'Copier le message'}</button></div>
              {d.url && <div className="fit"><a className="btn ghost" href={d.url} target="_blank" rel="noreferrer">Ouvrir le profil</a></div>}
              <div className="fit"><button className="btn" onClick={done}>Marquer comme envoyé</button></div>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>Colle le message dans le DM, envoie-le toi-même, puis clique sur « Marquer comme envoyé ».</p>
          </>
        )}
      </div>
    </div>
  );
}

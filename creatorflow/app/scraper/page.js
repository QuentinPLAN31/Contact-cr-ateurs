'use client';
import { useEffect, useState, useCallback } from 'react';

const STATUS = { pending: 'En attente', running: 'En cours', done: 'Terminée', error: 'Erreur', cancelled: 'Annulée' };

export default function Scraper() {
  const [data, setData] = useState({ jobs: [], online: false });
  const [err, setErr] = useState('');
  const [f, setF] = useState({ platform: 'tiktok', query: '', min_followers: 5000, max_followers: 200000, max_results: 50 });
  const load = useCallback(async () => {
    const r = await (await fetch('/api/jobs')).json();
    if (r.error) setErr(r.error); else { setErr(''); setData(r); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  const launch = async e => {
    e.preventDefault();
    const r = await (await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })).json();
    if (r.error) setErr(r.error); else { setF({ ...f, query: '' }); load(); }
  };
  const cancel = async id => { await fetch('/api/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'cancelled' }) }); load(); };

  return (
    <>
      <h1>Collecte</h1>
      <p className="muted">Lance une recherche de créateurs. Elle s’exécute sur ton PC via le worker (voir le dossier <code>worker</code>) et remplit ta liste automatiquement.</p>
      {err && <div className="msg err">{err}</div>}
      <div className="msg">
        <span className={data.online ? 'okc' : 'err'}>{data.online ? '● Worker connecté' : '● Worker hors ligne'}</span>
        {!data.online && <span className="muted"> — lance <code>npm start</code> dans le dossier <code>worker</code> sur ton PC. Les tâches attendront.</span>}
      </div>
      <form className="card" onSubmit={launch}>
        <h2>Nouvelle collecte</h2>
        <div className="row">
          <div style={{ flex: '0 0 170px' }}><label>Plateforme</label><select value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}><option value="tiktok">TikTok</option><option value="instagram">Instagram (expérimental)</option></select></div>
          <div><label>Hashtags / mots-clés (un par ligne ou séparés par des virgules)</label><textarea style={{ minHeight: 70 }} placeholder={'notion\nproductivité\nia outils'} value={f.query} onChange={e => setF({ ...f, query: e.target.value })} /></div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <div><label>Abonnés min</label><input type="number" value={f.min_followers} onChange={e => setF({ ...f, min_followers: e.target.value })} /></div>
          <div><label>Abonnés max (0 = sans limite)</label><input type="number" value={f.max_followers} onChange={e => setF({ ...f, max_followers: e.target.value })} /></div>
          <div><label>Créateurs max (300 maxi)</label><input type="number" value={f.max_results} onChange={e => setF({ ...f, max_results: e.target.value })} /></div>
          <div className="fit"><button className="btn">Lancer</button></div>
        </div>
      </form>
      <div className="card">
        <h2>Tâches</h2>
        {data.jobs.length === 0 ? <p className="muted">Aucune tâche pour l’instant.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>#</th><th>Réseau</th><th>Recherche</th><th>Statut</th><th>Trouvés</th><th>Ajoutés</th><th>Détail</th><th></th></tr></thead>
            <tbody>{data.jobs.map(j => (
              <tr key={j.id}>
                <td>{j.id}</td><td>{j.platform}</td><td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.query.replace(/\n/g, ', ')}</td>
                <td><span className="tag">{STATUS[j.status] || j.status}</span></td><td>{j.found}</td><td>{j.added}</td>
                <td className="muted" style={{ maxWidth: 260 }}>{j.message || ''}</td>
                <td>{['pending', 'running'].includes(j.status) && <button className="btn danger sm" onClick={() => cancel(j.id)}>Annuler</button>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

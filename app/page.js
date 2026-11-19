'use client';
import { useEffect, useState, useCallback } from 'react';
import { PLATFORMS, LABELS } from '@/lib/platforms';
import { followupsInBatches } from '@/lib/batch';
import DmModal from '@/components/DmModal';

const COLS = [['new', 'Nouveaux'], ['contacted', 'Contactés'], ['replied', 'Réponse'], ['negotiating', 'Négociation'], ['signed', 'Signés'], ['published', 'Publiés'], ['declined', 'Refus']];

export default function Pipeline() {
  const [all, setAll] = useState([]);
  const [due, setDue] = useState({ email: [], dm: [], sentToday: 0 });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pf, setPf] = useState('all');
  const [dm, setDm] = useState(null);

  const load = useCallback(async () => {
    const a = await (await fetch('/api/creators')).json();
    if (Array.isArray(a)) setAll(a); else setMsg(a.error || 'Erreur de chargement');
    const d = await (await fetch('/api/followups')).json();
    if (!d.error) setDue(d);
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = pf === 'all' ? all : all.filter(c => c.platform === pf);
  const move = async (id, status) => {
    await fetch('/api/creators', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  };
  const followups = async () => {
    setBusy(true); setMsg('Envoi des relances…');
    const r = await followupsInBatches(t => setMsg(`Relances : ${t.sent} envoyées…`));
    setMsg(`Relances : ${r.sent} envoyées, ${r.failed} échecs${r.blocked ? ', plafond quotidien atteint' : ''}.${r.errors[0] ? ' ' + r.errors[0] : ''}`);
    setBusy(false); load();
  };

  const count = s => list.filter(c => c.status === s).length;
  const contacted = list.filter(c => c.status !== 'new').length;
  const replied = list.filter(c => ['replied', 'negotiating', 'signed', 'published'].includes(c.status)).length;
  const rate = contacted ? Math.round((replied / contacted) * 100) : 0;

  return (
    <>
      <div className="row">
        <div><h1>Pipeline</h1><p className="muted" style={{ margin: 0 }}>De la prise de contact à la publication.</p></div>
        <div className="fit" style={{ width: 190 }}>
          <label>Plateforme</label>
          <select value={pf} onChange={e => setPf(e.target.value)}>
            <option value="all">Toutes</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{LABELS[p]}</option>)}
          </select>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><b>{list.length}</b>créateurs</div>
        <div className="stat"><b>{contacted}</b>contactés</div>
        <div className="stat"><b>{rate}%</b>taux de réponse</div>
        <div className="stat"><b>{count('signed') + count('published')}</b>signés</div>
        <div className="stat"><b>{due.sentToday}</b>emails aujourd’hui</div>
      </div>
      <div className="card row">
        <div><b>{due.email.length} relance(s) email à envoyer</b><div className="muted">Selon les délais définis dans Séquence.</div></div>
        <div className="fit"><button className="btn" disabled={busy || !due.email.length} onClick={followups}>Envoyer les relances</button></div>
      </div>
      {due.dm.length > 0 && (
        <div className="card">
          <b>{due.dm.length} relance(s) à faire en DM</b>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {due.dm.map(d => <button key={d.id} className="btn ghost sm" onClick={() => setDm({ id: d.id, name: d.name, step: d.step })}>{d.name} · {LABELS[d.platform] || d.platform}</button>)}
          </div>
        </div>
      )}
      {msg && <div className="msg">{msg}</div>}
      <div className="board">
        {COLS.map(([k, label]) => (
          <div className="col" key={k}>
            <h3>{label}<span>{count(k)}</span></h3>
            {list.filter(c => c.status === k).map(c => (
              <div className="item" key={c.id}>
                <b>{c.name}</b>
                <small>{LABELS[c.platform] || c.platform} · {c.audience ? c.audience.toLocaleString('fr-FR') : '—'}{c.niche ? ' · ' + c.niche : ''}</small>
                <small>{c.email || 'pas d’email (DM)'}{c.step ? ` · étape ${c.step}` : ''}</small>
                <select value={c.status} onChange={e => move(c.id, e.target.value)}>
                  {COLS.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>
      {dm && <DmModal creator={dm} step={dm.step} onClose={() => setDm(null)} onDone={load} />}
    </>
  );
}

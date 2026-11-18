'use client';
import { useEffect, useState, useCallback } from 'react';
import { PLATFORMS, LABELS, DISCOVER } from '@/lib/platforms';
import { sendInBatches } from '@/lib/batch';
import DmModal from '@/components/DmModal';

const post = (url, body, method = 'POST') => fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

export default function Creators() {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', url: '', niche: '', audience: '', platform: 'youtube' });
  const [dp, setDp] = useState('youtube');
  const [pf, setPf] = useState('all');
  const [dm, setDm] = useState(null);
  const [csv, setCsv] = useState('');

  const load = useCallback(async () => { const a = await (await fetch('/api/creators')).json(); if (Array.isArray(a)) setList(a); else setMsg(a.error || 'Erreur'); }, []);
  useEffect(() => { load(); }, [load]);

  const search = async () => {
    setBusy(true); setMsg('Recherche…');
    const r = await (await fetch('/api/discover?platform=' + dp + '&q=' + encodeURIComponent(q))).json();
    if (r.error) setMsg(r.error); else { setRes(r.items); setMsg(`${r.items.length} chaînes trouvées.`); }
    setBusy(false);
  };
  const addOne = async c => { await post('/api/creators', c); setRes(res.map(x => x.url === c.url ? { ...x, added: true } : x)); load(); };
  const addAll = async () => {
    const items = res.filter(c => !c.added); const r = await post('/api/creators', { items });
    setRes(res.map(x => ({ ...x, added: true }))); setMsg(`${r.added} ajoutés, ${r.skipped} ignorés.`); load();
  };
  const addForm = async e => {
    e.preventDefault(); const r = await post('/api/creators', form);
    setMsg(r.added ? 'Créateur ajouté.' : 'Déjà présent ou nom manquant.');
    setForm({ name: '', email: '', url: '', niche: '', audience: '', platform: form.platform }); load();
  };
  const importCsv = async () => {
    const r = await post('/api/import', { csv }); setMsg(`Import : ${r.added} ajoutés, ${r.skipped} ignorés.`); setCsv(''); load();
  };
  const onFile = e => { const f = e.target.files[0]; if (f) f.text().then(setCsv); };
  const patch = async (id, f) => { await post('/api/creators', { id, ...f }, 'PATCH'); load(); };
  const del = async id => { if (confirm('Supprimer ce créateur ?')) { await fetch('/api/creators?id=' + id, { method: 'DELETE' }); load(); } };
  const toggle = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const sendSelected = async () => {
    const ids = [...sel]; if (!ids.length) return;
    if (!confirm(`Envoyer l’email d’étape 1 à ${ids.length} créateur(s) ?`)) return;
    setBusy(true);
    const r = await sendInBatches(ids, 1, (t, done, total) => setMsg(`Envoi en cours (${done}/${total}), ne ferme pas la page…`));
    setMsg(`${r.sent} envoyés, ${r.failed} échecs${r.blocked ? ', plafond quotidien atteint (le reste est reporté)' : ''}.${r.errors[0] ? ' ' + r.errors[0] : ''}`);
    setSel(new Set()); setBusy(false); load();
  };

  return (
    <>
      <h1>Créateurs</h1>
      <p className="muted">Découvre, importe et contacte tes créateurs.</p>
      {msg && <div className="msg">{msg}</div>}

      <div className="card">
        <h2>Découvrir des créateurs</h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{DISCOVER.map(p => <button key={p} className={'btn sm' + (dp === p ? '' : ' ghost')} onClick={() => { setDp(p); setRes([]); }}>{LABELS[p]}</button>)}</div>
        <div className="row">
          <div><label>Mot-clé ou hashtag (ex : notion, productivité)</label><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} /></div>
          <div className="fit"><button className="btn" disabled={busy || !q} onClick={search}>Rechercher</button></div>
          {res.some(c => !c.added) && <div className="fit"><button className="btn ghost" onClick={addAll}>Tout ajouter</button></div>}
        </div>
        {res.length > 0 && (
          <div className="scroll"><table style={{ marginTop: 14 }}>
            <thead><tr><th>Chaîne</th><th>Abonnés</th><th>Email (description)</th><th></th></tr></thead>
            <tbody>{res.map(c => (
              <tr key={c.url}>
                <td><a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{c.name}</a></td>
                <td>{c.audience ? c.audience.toLocaleString('fr-FR') : '—'}</td>
                <td>{c.email || <span className="muted">à chercher sur la page À propos</span>}</td>
                <td>{c.added ? <span className="tag">ajouté</span> : <button className="btn sm" onClick={() => addOne(c)}>Ajouter</button>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>

      <div className="grid2">
        <form className="card" onSubmit={addForm}>
          <h2>Ajout manuel</h2>
          <div className="row"><div><label>Plateforme</label><select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p} value={p}>{LABELS[p]}</option>)}</select></div><div><label>Nom / chaîne *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div><div><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
          <div className="row" style={{ marginTop: 10 }}><div><label>Lien</label><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} /></div><div><label>Niche</label><input value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} /></div><div><label>Abonnés</label><input type="number" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} /></div></div>
          <div style={{ marginTop: 12 }}><button className="btn">Ajouter</button></div>
        </form>
        <div className="card">
          <h2>Import CSV</h2>
          <p className="muted" style={{ marginTop: 0 }}>Colonnes : name, email, url, niche, audience, platform (youtube, tiktok, instagram, linkedin, x…)</p>
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
          <textarea style={{ marginTop: 10, minHeight: 80 }} placeholder="…ou colle ton CSV ici" value={csv} onChange={e => setCsv(e.target.value)} />
          <div style={{ marginTop: 10 }}><button className="btn" disabled={!csv} onClick={importCsv}>Importer</button></div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0, flex: '1 1 auto' }}>Ma liste ({list.length})</h2>
          <div className="fit" style={{ width: 170 }}><select value={pf} onChange={e => setPf(e.target.value)}><option value="all">Toutes plateformes</option>{PLATFORMS.map(p => <option key={p} value={p}>{LABELS[p]}</option>)}</select></div>
          <div className="fit"><button className="btn" disabled={busy || !sel.size} onClick={sendSelected}>Envoyer l’étape 1 ({sel.size})</button></div>
        </div>
        <div className="scroll"><table>
          <thead><tr><th></th><th>Nom</th><th>Réseau</th><th>Email</th><th>Niche</th><th>Abonnés</th><th>Statut</th><th></th></tr></thead>
          <tbody>{list.filter(c => pf === 'all' || c.platform === pf).map(c => (
            <tr key={c.id}>
              <td><input type="checkbox" style={{ width: 'auto' }} disabled={!c.email || c.step > 0} checked={sel.has(c.id)} onChange={() => toggle(c.id)} /></td>
              <td>{c.url ? <a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{c.name}</a> : c.name}</td>
              <td>{LABELS[c.platform] || c.platform}</td>
              <td style={{ minWidth: 200 }}><input defaultValue={c.email || ''} placeholder="ajouter l’email" onBlur={e => e.target.value !== (c.email || '') && patch(c.id, { email: e.target.value })} /></td>
              <td>{c.niche || '—'}</td>
              <td>{c.audience ? c.audience.toLocaleString('fr-FR') : '—'}</td>
              <td><span className="tag">{c.status}{c.step ? ` · ${c.step}` : ''}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>{c.step < 3 && <button className="btn ghost sm" onClick={() => setDm({ id: c.id, name: c.name, step: c.step + 1 })}>DM</button>} <button className="btn danger sm" onClick={() => del(c.id)}>Suppr.</button></td>
            </tr>))}</tbody>
        </table></div>
      </div>
      {dm && <DmModal creator={dm} step={dm.step} onClose={() => setDm(null)} onDone={load} />}
    </>
  );
}

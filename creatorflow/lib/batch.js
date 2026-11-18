// Envoie par lots de 5 pour rester sous la limite de durée des fonctions Vercel.
export async function sendInBatches(ids, step, onProgress) {
  const total = { sent: 0, failed: 0, blocked: 0, errors: [] };
  for (let i = 0; i < ids.length; i += 5) {
    const r = await (await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ids.slice(i, i + 5), step }) })).json();
    if (r.error) { total.errors.push(r.error); total.failed += ids.slice(i, i + 5).length; } else {
      total.sent += r.sent; total.failed += r.failed; total.blocked += r.blocked; total.errors.push(...r.errors);
    }
    onProgress && onProgress(total, Math.min(i + 5, ids.length), ids.length);
    if (total.blocked) break;
  }
  return total;
}

export async function followupsInBatches(onProgress) {
  const total = { sent: 0, failed: 0, blocked: 0, errors: [] };
  for (let guard = 0; guard < 40; guard++) {
    const r = await (await fetch('/api/followups', { method: 'POST' })).json();
    if (r.error) { total.errors.push(r.error); break; }
    total.sent += r.sent; total.failed += r.failed; total.blocked += r.blocked; total.errors.push(...r.errors);
    onProgress && onProgress(total);
    if (!r.remaining || r.blocked || r.failed || !r.sent) break;
  }
  return total;
}

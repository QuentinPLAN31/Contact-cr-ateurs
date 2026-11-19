export const safe = fn => async (...args) => {
  try { return await fn(...args); }
  catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }
};

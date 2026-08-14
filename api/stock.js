import { db, readSessionCookie, verifySession } from '../lib/auth.js';

// Retorna o snapshot de estoque mais recente (para a tela Produtos). Só logado.
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });

  try {
    const sql = db();
    const rows = await sql`
      select to_char(captured_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as captured_at, payload
      from stock_snapshot order by captured_at desc limit 1`;
    if (!rows[0]) return res.status(200).json({ empty: true });
    return res.status(200).json({ capturedAt: rows[0].captured_at, ...rows[0].payload });
  } catch (e) {
    console.error('stock error:', e?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}

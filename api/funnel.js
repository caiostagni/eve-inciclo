import { db, readSessionCookie, verifySession } from '../lib/auth.js';

// Retorna o snapshot mais recente do funil (para a tela Jornada). Só logado.
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });

  try {
    const sql = db();
    const rows = await sql`
      select to_char(captured_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as captured_at, payload
      from funnel_snapshot order by captured_at desc limit 1`;
    if (!rows[0]) return res.status(200).json({ empty: true });
    return res.status(200).json({ capturedAt: rows[0].captured_at, ...rows[0].payload });
  } catch (e) {
    console.error('funnel error:', e?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}

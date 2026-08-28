import { db } from '../lib/auth.js';

// Recebe o estoque enviado pelo leitor interno (scripts/sankhya-reader.mjs) e grava o snapshot.
// Autenticação: Authorization: Bearer <SANKHYA_INGEST_SECRET>.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }

  const secret = process.env.SANKHYA_INGEST_SECRET;
  const hdr = req.headers.authorization || '';
  if (!secret || hdr !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorized' });

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rows = Array.isArray(b.rows) ? b.rows : [];

    let map = {};
    try { map = JSON.parse(process.env.SANKHYA_MAP || '{}'); } catch { map = {}; }
    const low = parseInt(process.env.SANKHYA_LOW || '2', 10);
    const byCod = {};
    for (const [pid, cod] of Object.entries(map)) byCod[String(cod).trim()] = pid;

    const items = {};
    for (const r of rows) {
      const pid = byCod[String(r.codprod).trim()];
      if (!pid) continue;
      if (!items[pid]) items[pid] = { qtd: 0 };
      items[pid].qtd += Number(r.saldo) || 0;
    }
    for (const pid of Object.keys(items)) {
      const q = items[pid].qtd;
      items[pid].status = q <= 0 ? 'out' : (q <= low ? 'low' : 'ok');
    }

    const payload = { items, rowsCount: rows.length, mapped: Object.keys(items).length };
    const sql = db();
    await sql`insert into stock_snapshot (source, payload) values ('sankhya-reader', ${JSON.stringify(payload)}::jsonb)`;
    return res.status(200).json({ ok: true, ...payload });
  } catch (e) {
    console.error('stock-ingest error:', e?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}

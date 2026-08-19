import { readSessionCookie, verifySession } from '../../lib/auth.js';
import { login, runQuery, fetchStock, DEFAULT_BASE, DEFAULT_STOCK_SQL } from '../../lib/sankhya.js';

// Diagnóstico Sankhya (admin): valida login e ajuda a mapear produtos.
//   (sem params)     → testa login + roda a SQL de saldo (primeiras linhas)
//   ?find=BESOURO    → lista CODPROD/REFERENCIA/DESCRPROD que casam com o termo (p/ montar SANKHYA_MAP)
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let s = null;
  try { if (token) s = await verifySession(token); } catch { s = null; }
  if (!s || s.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

  const cfg = {
    base: process.env.SANKHYA_BASE_URL || DEFAULT_BASE,
    username: process.env.SANKHYA_USERNAME,
    password: process.env.SANKHYA_PASSWORD,
    sql: process.env.SANKHYA_STOCK_SQL || DEFAULT_STOCK_SQL,
  };
  if (!cfg.username || !cfg.password) return res.status(503).json({ error: 'not_configured', message: 'Faltam SANKHYA_USERNAME / SANKHYA_PASSWORD.' });

  try {
    const session = await login(cfg); // valida credenciais

    const find = req.query?.find;
    if (find) {
      const term = String(find).toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 40);
      const sql = `SELECT CODPROD, REFERENCIA, DESCRPROD FROM TGFPRO WHERE UPPER(DESCRPROD) LIKE '%${term}%' ORDER BY DESCRPROD`;
      const { rows } = await runQuery(cfg, sql, session);
      return res.status(200).json({ ok: true, term, count: rows.length, produtos: rows.slice(0, 60).map((r) => ({ codprod: r[0], ref: r[1], desc: r[2] })) });
    }

    const rows = await fetchStock({ ...cfg });
    return res.status(200).json({ ok: true, loginOk: true, sql: cfg.sql, totalRows: rows.length, amostra: rows.slice(0, 15) });
  } catch (e) {
    console.error('sankhya probe error:', e?.status, e?.message, e?.body);
    return res.status(502).json({ error: 'sankhya_error', status: e?.status, detail: e?.body || e?.message });
  }
}

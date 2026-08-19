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

    // só valida o login (não roda query)
    if (req.query?.step === 'login') return res.status(200).json({ ok: true, loginOk: true });

    // testa estratégias de autenticação da consulta externa (executeQuery)
    if (req.query?.authtest) {
      const q = 'SELECT 1 FROM TGFPRO WHERE 1=0';
      const strategies = [
        { name: 'mgeSession+cookie', qp: { mgeSession: session }, h: { Cookie: 'JSESSIONID=' + session } },
        { name: 'authorization-bearer', qp: {}, h: { Authorization: 'Bearer ' + session } },
        { name: 'token-header', qp: {}, h: { token: session } },
        { name: 'token-bearer', qp: {}, h: { token: 'Bearer ' + session } },
      ];
      const out = [];
      for (const st of strategies) {
        try {
          const url = new URL(cfg.base.replace(/\/$/, '') + '/service.sbr');
          url.searchParams.set('serviceName', 'DbExplorerSP.executeQuery');
          url.searchParams.set('outputType', 'json');
          for (const [k, v] of Object.entries(st.qp)) url.searchParams.set(k, v);
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...st.h }, body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: q } }) });
          const raw = new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());
          let j = {}; try { j = JSON.parse(raw); } catch { /* */ }
          out.push({ strategy: st.name, http: r.status, status: j.status ?? null, msg: String(j.statusMessage || '').slice(0, 130) });
        } catch (e) { out.push({ strategy: st.name, error: e.message }); }
      }
      return res.status(200).json({ loginOk: true, tests: out });
    }

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
    return res.status(502).json({ error: 'sankhya_error', status: e?.status, service: e?.message, detail: e?.body || e?.message });
  }
}

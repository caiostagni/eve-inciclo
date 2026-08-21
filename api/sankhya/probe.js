import { readSessionCookie, verifySession } from '../../lib/auth.js';
import { login, loginRaw, fetchStock, searchProducts, DEFAULT_BASE } from '../../lib/sankhya.js';

// Diagnóstico Sankhya (admin): valida login e ajuda a mapear produtos.
//   ?step=login    → só valida o login
//   ?find=BESOURO  → lista CODPROD/REFERENCIA/DESCRPROD que casam (p/ montar SANKHYA_MAP)
//   (sem params)   → login + amostra da consulta de estoque (loadRecords)
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let s = null;
  try { if (token) s = await verifySession(token); } catch { s = null; }
  if (!s || s.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

  const cfg = {
    base: process.env.SANKHYA_BASE_URL || DEFAULT_BASE,
    username: process.env.SANKHYA_USERNAME,
    password: process.env.SANKHYA_PASSWORD,
  };
  if (!cfg.username || !cfg.password) return res.status(503).json({ error: 'not_configured', message: 'Faltam SANKHYA_USERNAME / SANKHYA_PASSWORD.' });

  try {
    // dump da resposta de login (redige o jsessionid) — p/ ver se há token/bearer
    if (req.query?.logininfo) {
      const j = await loginRaw(cfg);
      const rb = { ...(j?.responseBody || {}) };
      if (rb.jsessionid) rb.jsessionid = { $: '***redacted***' };
      return res.status(200).json({ status: j?.status, keys: Object.keys(rb), responseBody: rb });
    }

    const session = await login(cfg); // valida credenciais
    if (req.query?.step === 'login') return res.status(200).json({ ok: true, loginOk: true });

    if (req.query?.find) {
      const produtos = await searchProducts(cfg, req.query.find, session);
      return res.status(200).json({ ok: true, count: produtos.length, produtos: produtos.slice(0, 60) });
    }

    const rows = await fetchStock(cfg, session);
    return res.status(200).json({ ok: true, loginOk: true, totalRows: rows.length, amostra: rows.slice(0, 15) });
  } catch (e) {
    console.error('sankhya probe error:', e?.status, e?.message, e?.body);
    return res.status(502).json({ error: 'sankhya_error', status: e?.status, service: e?.message, detail: e?.body || e?.message });
  }
}

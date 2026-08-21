import { readSessionCookie, verifySession } from '../../lib/auth.js';
import { getBearer, fetchStock, searchProducts, DEFAULT_BASE } from '../../lib/sankhya.js';

// Diagnóstico Sankhya (admin).
//   ?step=bearer   → só valida a obtenção do Bearer
//   ?find=BESOURO  → busca produtos (p/ montar SANKHYA_MAP)
//   (sem params)   → amostra da consulta de estoque
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let s = null;
  try { if (token) s = await verifySession(token); } catch { s = null; }
  if (!s || s.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

  const cfg = {
    base: process.env.SANKHYA_BASE_URL || DEFAULT_BASE,
    username: process.env.SANKHYA_USERNAME,
    password: process.env.SANKHYA_PASSWORD,
    appkey: process.env.SANKHYA_APPKEY,
    token: process.env.SANKHYA_TOKEN,
  };
  if (!cfg.username || !cfg.password || !cfg.appkey || !cfg.token) {
    return res.status(503).json({ error: 'not_configured', message: 'Faltam SANKHYA_USERNAME/PASSWORD/APPKEY/TOKEN.' });
  }

  // Testa variações do nome do serviço de OAuth (o MGE recusou 'login_oauth')
  if (req.query?.svctest) {
    const dec = (buf) => new TextDecoder('iso-8859-1').decode(buf);
    const cands = ['MobileLoginSP.login_oauth', 'MobileLoginSP.loginOAuth', 'MobileLoginSP.loginOauth', 'MobileLoginSP.oauthLogin', 'MobileLoginSP.loginOAuth2', 'MobileLoginSP.login'];
    const out = [];
    for (const sn of cands) {
      try {
        const url = new URL(cfg.base.replace(/\/$/, '') + '/service.sbr');
        url.searchParams.set('serviceName', sn); url.searchParams.set('outputType', 'json'); url.searchParams.set('output', 'json');
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', appkey: cfg.appkey, token: cfg.token }, body: JSON.stringify({ serviceName: sn, requestBody: { nomusu: { $: cfg.username }, internumpadd: { $: cfg.password } } }) });
        const raw = dec(await r.arrayBuffer()); let j = {}; try { j = JSON.parse(raw); } catch { /* */ }
        const bearer = j?.responseBody?.bearerToken?.$ || j?.responseBody?.bearerToken || null;
        out.push({ serviceName: sn, status: j.status ?? null, gotBearer: !!bearer, respKeys: j.responseBody ? Object.keys(j.responseBody) : null, msg: String(j.statusMessage || '').slice(0, 130) });
      } catch (e) { out.push({ serviceName: sn, error: e.message }); }
    }
    return res.status(200).json({ out });
  }

  try {
    const bearer = await getBearer(cfg);
    if (req.query?.step === 'bearer') return res.status(200).json({ ok: true, bearerOk: true });

    if (req.query?.find) {
      const produtos = await searchProducts(cfg, req.query.find, bearer);
      return res.status(200).json({ ok: true, count: produtos.length, produtos: produtos.slice(0, 60) });
    }

    const rows = await fetchStock(cfg, bearer);
    return res.status(200).json({ ok: true, totalRows: rows.length, amostra: rows.slice(0, 15) });
  } catch (e) {
    console.error('sankhya probe error:', e?.status, e?.message, e?.body);
    return res.status(502).json({ error: 'sankhya_error', status: e?.status, service: e?.message, detail: e?.body || e?.message });
  }
}

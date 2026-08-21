import { readSessionCookie, verifySession } from '../../lib/auth.js';
import { login, loginRaw, fetchStock, searchProducts, DEFAULT_BASE } from '../../lib/sankhya.js';

// Diagnóstico Sankhya (admin).
//   ?bearertest=1  → tenta obter o Bearer do Autenticador (várias estratégias) e testa loadRecords
//   ?step=login    → só valida o login (jsessionid)
//   ?logininfo=1   → dump da resposta de login
//   ?find=BESOURO  → busca produtos (p/ SANKHYA_MAP)
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
  };
  if (!cfg.username || !cfg.password) return res.status(503).json({ error: 'not_configured', message: 'Faltam SANKHYA_USERNAME / SANKHYA_PASSWORD.' });

  // ── Descoberta do fluxo de Bearer (Autenticador) ──
  if (req.query?.bearertest) {
    const appkey = process.env.SANKHYA_APPKEY, apptoken = process.env.SANKHYA_TOKEN;
    if (!appkey || !apptoken) return res.status(503).json({ error: 'no_keys', message: 'Faltam SANKHYA_APPKEY / SANKHYA_TOKEN na Vercel.' });
    const dec = (buf) => new TextDecoder('iso-8859-1').decode(buf);
    const gwBase = cfg.base.replace(/\/mge\/?$/, '');
    const b64u = Buffer.from(cfg.username).toString('base64');
    const b64p = Buffer.from(cfg.password).toString('base64');

    async function tryB(name, url, headers, body) {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
        const raw = dec(await r.arrayBuffer());
        let j = {}; try { j = JSON.parse(raw); } catch { /* */ }
        const bearer = j.bearerToken || j.access_token || j?.responseBody?.bearerToken?.$ || j?.responseBody?.bearerToken || null;
        return { name, http: r.status, status: j.status ?? null, respKeys: j.responseBody ? Object.keys(j.responseBody) : Object.keys(j), gotBearer: !!bearer, msg: String(j.statusMessage || '').slice(0, 130), rawHead: bearer ? undefined : raw.slice(0, 170), _bearer: bearer };
      } catch (e) { return { name, error: e.message }; }
    }

    const attempts = [];
    attempts.push(await tryB('gw /login (plain)', gwBase + '/login', { appkey, token: apptoken, username: cfg.username, password: cfg.password }));
    attempts.push(await tryB('gw /login (b64)', gwBase + '/login', { appkey, token: apptoken, username: b64u, password: b64p }));
    attempts.push(await tryB('mge MobileLoginSP + appkey/token headers', cfg.base.replace(/\/$/, '') + '/service.sbr?serviceName=MobileLoginSP.login&outputType=json', { appkey, token: apptoken }, { serviceName: 'MobileLoginSP.login', requestBody: { NOMUSU: { $: cfg.username }, INTERNO: { $: cfg.password } } }));

    // Para quem obteve bearer, testa a consulta de estoque
    for (const a of attempts) {
      if (a._bearer) {
        try {
          const url = new URL(cfg.base.replace(/\/$/, '') + '/service.sbr');
          url.searchParams.set('serviceName', 'CRUDServiceProvider.loadRecords'); url.searchParams.set('outputType', 'json'); url.searchParams.set('output', 'json');
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a._bearer }, body: JSON.stringify({ serviceName: 'CRUDServiceProvider.loadRecords', requestBody: { dataSet: { rootEntity: 'Estoque', includePresentationFields: 'N', offsetPage: '0', criteria: { expression: { $: 'this.ESTOQUE > 0' } }, entity: { fieldset: { list: 'CODPROD,ESTOQUE' } } } } }) });
          const raw = dec(await r.arrayBuffer()); let j = {}; try { j = JSON.parse(raw); } catch { /* */ }
          a.loadRecordsStatus = j.status ?? null; a.loadRecordsMsg = String(j.statusMessage || '').slice(0, 110); a.loadRecordsWorks = String(j.status) === '1';
        } catch (e) { a.loadRecordsErr = e.message; }
      }
      delete a._bearer;
    }
    return res.status(200).json({ gwBase, attempts });
  }

  try {
    if (req.query?.logininfo) {
      const j = await loginRaw(cfg);
      const rb = { ...(j?.responseBody || {}) };
      if (rb.jsessionid) rb.jsessionid = { $: '***redacted***' };
      return res.status(200).json({ status: j?.status, keys: Object.keys(rb), responseBody: rb });
    }

    const session = await login(cfg);
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

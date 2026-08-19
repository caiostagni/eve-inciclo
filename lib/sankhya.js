// Cliente do Sankhya ERP ON-PREMISE (MGE / Sankhya-W). Sem appkey.
// Fluxo: POST MobileLoginSP.login (usuário/senha) → jsessionid; depois
// DbExplorerSP.executeQuery na mesma sessão (mgeSession=jsessionid).
// ⚠️ O endpoint do Altair é HTTP (texto aberto) e usa login de usuário.

export const DEFAULT_BASE = 'http://cicloway.speedpro.com.br:8786/mge';

// Saldo por produto (TGFEST = estoque, TGFPRO = produto). Ajustar filtros (CODEMP/CODLOCAL) se a T.I. pedir.
export const DEFAULT_STOCK_SQL =
  'SELECT P.CODPROD, P.REFERENCIA, P.DESCRPROD, SUM(NVL(E.ESTOQUE,0) - NVL(E.RESERVADO,0)) AS SALDO ' +
  'FROM TGFEST E INNER JOIN TGFPRO P ON P.CODPROD = E.CODPROD ' +
  'GROUP BY P.CODPROD, P.REFERENCIA, P.DESCRPROD';

// Chama um serviço do MGE (service.sbr). Se `session`, envia mgeSession na query.
async function mgeService(base, serviceName, requestBody, session) {
  const url = new URL(base.replace(/\/$/, '') + '/service.sbr');
  url.searchParams.set('serviceName', serviceName);
  url.searchParams.set('outputType', 'json');
  if (session) url.searchParams.set('mgeSession', session);

  const headers = { 'Content-Type': 'application/json' };
  if (session) headers.Cookie = 'JSESSIONID=' + session; // sessão via cookie também

  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ serviceName, requestBody }),
  });
  // O MGE responde em ISO-8859-1 (Latin-1); decodificamos manualmente p/ acentos corretos.
  const raw = new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());
  if (!r.ok) {
    const e = new Error('Sankhya ' + serviceName + ' HTTP ' + r.status);
    e.status = r.status; e.body = raw.slice(0, 300);
    throw e;
  }
  let j = {};
  try { j = JSON.parse(raw); } catch { j = {}; }
  if (j && j.status != null && String(j.status) !== '1') {
    const e = new Error('Sankhya ' + serviceName + ' status ' + j.status);
    e.status = 401; e.body = String(j.statusMessage || '').slice(0, 300);
    throw e;
  }
  return j;
}

// Autentica e devolve o jsessionid da sessão.
export async function login(cfg) {
  const j = await mgeService(cfg.base, 'MobileLoginSP.login', {
    NOMUSU: { $: cfg.username },
    INTERNO: { $: cfg.password },
  });
  const sess = j?.responseBody?.jsessionid?.$;
  if (!sess) { const e = new Error('Sankhya login sem jsessionid'); e.status = 502; throw e; }
  return sess;
}

// Executa uma SQL na sessão e devolve as linhas cruas (array de arrays).
export async function runQuery(cfg, sql, session) {
  const sess = session || (await login(cfg));
  const j = await mgeService(cfg.base, 'DbExplorerSP.executeQuery', { sql }, sess);
  return { rows: j?.responseBody?.rows || [], session: sess };
}

// Saldo por produto → [{ codprod, ref, desc, saldo }].
export async function fetchStock(cfg) {
  const { rows } = await runQuery(cfg, cfg.sql || DEFAULT_STOCK_SQL);
  // rows na ordem da SELECT: [CODPROD, REFERENCIA, DESCRPROD, SALDO]
  return rows.map((row) => ({
    codprod: row[0] != null ? String(row[0]).trim() : '',
    ref: row[1] != null ? String(row[1]).trim() : '',
    desc: row[2] != null ? String(row[2]).trim() : '',
    saldo: Number(row[3]) || 0,
  }));
}

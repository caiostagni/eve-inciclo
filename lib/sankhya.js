// Cliente do Sankhya ERP (Gateway de API) — busca o saldo de estoque por produto.
// Fluxo padrão do Gateway: POST /login (headers token/appkey/username/password) → bearerToken;
// depois DbExplorerSP.executeQuery com uma SQL de saldo. Os detalhes (URL do gateway, filtro de
// empresa/local, nomes de tabela) variam por instalação — por isso base e SQL são configuráveis.
// ⚠️ A confirmar com a T.I. (Altair): endpoint do gateway, credenciais e a query de saldo correta.

export const DEFAULT_BASE = 'https://api.sankhya.com.br';

// Saldo por produto (TGFEST = estoque, TGFPRO = produto). Ajustar filtros (CODEMP/CODLOCAL) com a T.I.
export const DEFAULT_STOCK_SQL =
  'SELECT P.CODPROD, P.REFERENCIA, P.DESCRPROD, SUM(E.ESTOQUE - E.RESERVADO) AS SALDO ' +
  'FROM TGFEST E JOIN TGFPRO P ON P.CODPROD = E.CODPROD ' +
  'GROUP BY P.CODPROD, P.REFERENCIA, P.DESCRPROD';

// Autentica no Gateway e devolve o bearer token.
export async function getBearer(cfg) {
  const r = await fetch(cfg.base.replace(/\/$/, '') + '/login', {
    method: 'POST',
    headers: { token: cfg.token, appkey: cfg.appkey, username: cfg.username, password: cfg.password },
  });
  if (!r.ok) {
    const e = new Error('Sankhya login ' + r.status);
    e.status = r.status; e.body = (await r.text().catch(() => '')).slice(0, 300);
    throw e;
  }
  const j = await r.json().catch(() => ({}));
  const bearer = j.bearerToken || j.access_token;
  if (!bearer) { const e = new Error('Sankhya login sem bearerToken'); e.status = 502; e.body = JSON.stringify(j).slice(0, 300); throw e; }
  return bearer;
}

// Executa a SQL de saldo e devolve linhas [{ codprod, ref, desc, saldo }].
export async function fetchStock(cfg) {
  const bearer = await getBearer(cfg);
  const url = cfg.base.replace(/\/$/, '') + '/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + bearer },
    body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: cfg.sql || DEFAULT_STOCK_SQL } }),
  });
  if (!r.ok) {
    const e = new Error('Sankhya query ' + r.status);
    e.status = r.status; e.body = (await r.text().catch(() => '')).slice(0, 300);
    throw e;
  }
  const j = await r.json().catch(() => ({}));
  const rows = (j && j.responseBody && j.responseBody.rows) || [];
  // rows = array de arrays na ordem da SELECT: [CODPROD, REFERENCIA, DESCRPROD, SALDO]
  return rows.map((row) => ({
    codprod: row[0] != null ? String(row[0]).trim() : '',
    ref: row[1] != null ? String(row[1]).trim() : '',
    desc: row[2] != null ? String(row[2]).trim() : '',
    saldo: Number(row[3]) || 0,
  }));
}

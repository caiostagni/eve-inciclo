// Cliente do Sankhya ERP ON-PREMISE (MGE). Fluxo confirmado com a T.I.:
//  1) MobileLoginSP.login_oauth (headers appkey+token, body nomusu/internumpadd) → bearerToken
//  2) CRUDServiceProvider.loadRecords com Authorization: Bearer <bearerToken>
// ⚠️ Endpoint HTTP (texto aberto). Segredos (appkey/token) só via env, nunca no código.

export const DEFAULT_BASE = 'http://cicloway.speedpro.com.br:8786/mge';

function svcUrl(base, serviceName) {
  const url = new URL(base.replace(/\/$/, '') + '/service.sbr');
  url.searchParams.set('serviceName', serviceName);
  url.searchParams.set('outputType', 'json');
  url.searchParams.set('output', 'json');
  return url;
}

// O MGE responde em ISO-8859-1 (Latin-1). Faz o parse e valida status.
async function readJson(r, serviceName) {
  const raw = new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());
  if (!r.ok) { const e = new Error('Sankhya ' + serviceName + ' HTTP ' + r.status); e.status = r.status; e.body = raw.slice(0, 300); throw e; }
  let j = {}; try { j = JSON.parse(raw); } catch { j = {}; }
  if (j && j.status != null && String(j.status) !== '1') {
    const e = new Error('Sankhya ' + serviceName + ' status ' + j.status);
    e.status = 401; e.body = String(j.statusMessage || raw).slice(0, 300);
    throw e;
  }
  return j;
}

// Troca appkey + token (Client Secret) + usuário/senha por um Bearer Token do Autenticador.
export async function getBearer(cfg) {
  const r = await fetch(svcUrl(cfg.base, 'MobileLoginSP.login_oauth'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', appkey: cfg.appkey, token: cfg.token },
    body: JSON.stringify({ serviceName: 'MobileLoginSP.login_oauth', requestBody: { nomusu: { $: cfg.username }, internumpadd: { $: cfg.password } } }),
  });
  const j = await readJson(r, 'MobileLoginSP.login_oauth');
  const bearer = j?.responseBody?.bearerToken?.$ || j?.responseBody?.bearerToken || j.bearerToken;
  if (!bearer) { const e = new Error('Sankhya sem bearerToken'); e.status = 502; e.body = JSON.stringify(j).slice(0, 300); throw e; }
  return bearer;
}

// Chama um serviço de dados com o Bearer.
async function dataService(cfg, serviceName, requestBody, bearer) {
  const r = await fetch(svcUrl(cfg.base, serviceName), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + bearer },
    body: JSON.stringify({ serviceName, requestBody }),
  });
  return readJson(r, serviceName);
}

// Uma página do loadRecords. includePresentationFields=N → campos vêm como f0,f1,... na ordem do `list`.
async function loadRecordsPage(cfg, rootEntity, fieldList, expression, offsetPage, bearer) {
  const dataSet = { rootEntity, includePresentationFields: 'N', offsetPage: String(offsetPage), entity: { fieldset: { list: fieldList } } };
  if (expression) dataSet.criteria = { expression: { $: expression } };
  const j = await dataService(cfg, 'CRUDServiceProvider.loadRecords', { dataSet }, bearer);
  const ents = j?.responseBody?.entities;
  const fields = fieldList.split(',');
  let arr = ents && ents.entity ? ents.entity : [];
  if (!Array.isArray(arr)) arr = [arr];
  const records = arr.map((e) => { const o = {}; fields.forEach((fn, i) => { const c = e['f' + i]; o[fn] = c != null ? c.$ : undefined; }); return o; });
  const hasMore = ents ? String(ents.hasMoreResult) === 'true' : false;
  return { records, hasMore };
}

async function loadAll(cfg, rootEntity, fieldList, expression, bearer) {
  const out = [];
  const MAX_PAGES = 200;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { records, hasMore } = await loadRecordsPage(cfg, rootEntity, fieldList, expression, page, bearer);
    out.push(...records);
    if (!hasMore || records.length === 0) break;
  }
  return out;
}

// Saldo de estoque (entidade Estoque = TGFEST) → [{ codprod, saldo }]. O cron soma por produto.
export async function fetchStock(cfg, bearer) {
  const b = bearer || (await getBearer(cfg));
  const recs = await loadAll(cfg, 'Estoque', 'CODPROD,CODEMP,CODLOCAL,ESTOQUE,RESERVADO', 'this.ESTOQUE > 0', b);
  return recs.map((r) => ({
    codprod: r.CODPROD != null ? String(r.CODPROD).trim() : '',
    saldo: (Number(r.ESTOQUE) || 0) - (Number(r.RESERVADO) || 0),
  }));
}

// Busca produtos (entidade Produto = TGFPRO) por termo — p/ montar o SANKHYA_MAP.
export async function searchProducts(cfg, term, bearer) {
  const b = bearer || (await getBearer(cfg));
  const t = String(term || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 40);
  const recs = await loadAll(cfg, 'Produto', 'CODPROD,REFERENCIA,DESCRPROD', `upper(this.DESCRPROD) like '%${t}%'`, b);
  return recs.map((r) => ({ codprod: r.CODPROD, ref: r.REFERENCIA, desc: r.DESCRPROD }));
}

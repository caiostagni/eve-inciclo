// Cliente do Sankhya ERP ON-PREMISE (MGE / Sankhya-W). Sem appkey/Bearer.
// Fluxo (confirmado com a T.I.): POST MobileLoginSP.login (usuário/senha) → jsessionid;
// depois CRUDServiceProvider.loadRecords na mesma sessão (cookie JSESSIONID).
// ⚠️ O endpoint é HTTP (texto aberto) e usa login de usuário.

export const DEFAULT_BASE = 'http://cicloway.speedpro.com.br:8786/mge';

// Chama um serviço do MGE (service.sbr). Se `session`, envia o cookie JSESSIONID.
async function mgeService(base, serviceName, requestBody, session) {
  const url = new URL(base.replace(/\/$/, '') + '/service.sbr');
  url.searchParams.set('serviceName', serviceName);
  url.searchParams.set('outputType', 'json');
  url.searchParams.set('output', 'json');

  const headers = { 'Content-Type': 'application/json' };
  if (session) headers.Cookie = 'JSESSIONID=' + session;

  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ serviceName, requestBody }) });
  // O MGE responde em ISO-8859-1 (Latin-1); decodificamos p/ acentos corretos.
  const raw = new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());
  if (!r.ok) { const e = new Error('Sankhya ' + serviceName + ' HTTP ' + r.status); e.status = r.status; e.body = raw.slice(0, 300); throw e; }
  let j = {};
  try { j = JSON.parse(raw); } catch { j = {}; }
  if (j && j.status != null && String(j.status) !== '1') {
    const e = new Error('Sankhya ' + serviceName + ' status ' + j.status);
    e.status = 401; e.body = String(j.statusMessage || '').slice(0, 300);
    throw e;
  }
  return j;
}

// Login cru (devolve o JSON completo — p/ diagnóstico).
export async function loginRaw(cfg) {
  return mgeService(cfg.base, 'MobileLoginSP.login', { NOMUSU: { $: cfg.username }, INTERNO: { $: cfg.password } });
}

// Autentica e devolve o jsessionid da sessão.
export async function login(cfg) {
  const j = await loginRaw(cfg);
  const sess = j?.responseBody?.jsessionid?.$;
  if (!sess) { const e = new Error('Sankhya login sem jsessionid'); e.status = 502; throw e; }
  return sess;
}

// Uma página do loadRecords. includePresentationFields=N → campos vêm como f0,f1,... na ordem do `list`.
async function loadRecordsPage(cfg, rootEntity, fieldList, expression, offsetPage, session) {
  const dataSet = {
    rootEntity,
    includePresentationFields: 'N',
    offsetPage: String(offsetPage),
    entity: { fieldset: { list: fieldList } },
  };
  if (expression) dataSet.criteria = { expression: { $: expression } };

  const j = await mgeService(cfg.base, 'CRUDServiceProvider.loadRecords', { dataSet }, session);
  const ents = j?.responseBody?.entities;
  const fields = fieldList.split(',');
  let arr = ents && ents.entity ? ents.entity : [];
  if (!Array.isArray(arr)) arr = [arr];
  const records = arr.map((e) => {
    const o = {};
    fields.forEach((fn, i) => { const c = e['f' + i]; o[fn] = c != null ? c.$ : undefined; });
    return o;
  });
  const hasMore = ents ? String(ents.hasMoreResult) === 'true' : false;
  return { records, hasMore };
}

// Percorre todas as páginas de uma entidade (com teto de segurança).
async function loadAll(cfg, rootEntity, fieldList, expression, session) {
  const out = [];
  const MAX_PAGES = 200;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { records, hasMore } = await loadRecordsPage(cfg, rootEntity, fieldList, expression, page, session);
    out.push(...records);
    if (!hasMore || records.length === 0) break;
  }
  return out;
}

// Saldo de estoque (entidade Estoque = TGFEST). Uma linha por CODPROD/CODEMP/CODLOCAL.
// Retorna [{ codprod, saldo }] (saldo = ESTOQUE - RESERVADO). O cron soma por produto.
export async function fetchStock(cfg, session) {
  const sess = session || (await login(cfg));
  const recs = await loadAll(cfg, 'Estoque', 'CODPROD,CODEMP,CODLOCAL,ESTOQUE,RESERVADO', 'this.ESTOQUE > 0', sess);
  return recs.map((r) => ({
    codprod: r.CODPROD != null ? String(r.CODPROD).trim() : '',
    saldo: (Number(r.ESTOQUE) || 0) - (Number(r.RESERVADO) || 0),
  }));
}

// Busca produtos (entidade Produto = TGFPRO) por termo na descrição — p/ montar o SANKHYA_MAP.
export async function searchProducts(cfg, term, session) {
  const sess = session || (await login(cfg));
  const t = String(term || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 40);
  const recs = await loadAll(cfg, 'Produto', 'CODPROD,REFERENCIA,DESCRPROD', `upper(this.DESCRPROD) like '%${t}%'`, sess);
  return recs.map((r) => ({ codprod: r.CODPROD, ref: r.REFERENCIA, desc: r.DESCRPROD }));
}

// ─────────────────────────────────────────────────────────────────────────────
// LEITOR DE ESTOQUE DO SANKHYA — roda DENTRO da rede da CicloWay (ou onde a sessão
// for aceita). Usa só usuário/senha (login nativo), SEM gateway/Bearer.
//   Fluxo: MobileLoginSP.login -> jsessionid -> CRUDServiceProvider.loadRecords.
//
// TESTE (só imprime; confirma se este computador consegue ler + revela os CODPROD):
//   SANKHYA_USERNAME=STAGNI SANKHYA_PASSWORD='sua-senha' node scripts/sankhya-reader.mjs --test
//
// PRODUÇÃO (lê e envia pro InCiclo — agendar 1x/dia):
//   SANKHYA_USERNAME=STAGNI SANKHYA_PASSWORD='...' \
//   SANKHYA_INGEST_URL='https://eve-inciclo.vercel.app/api/stock-ingest' \
//   SANKHYA_INGEST_SECRET='...' node scripts/sankhya-reader.mjs
// Requer Node 18+ (fetch nativo). Sem dependências externas.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = process.env.SANKHYA_BASE_URL || 'http://cicloway.speedpro.com.br:8786/mge';
const USER = process.env.SANKHYA_USERNAME;
const PASS = process.env.SANKHYA_PASSWORD;
const TEST = process.argv.includes('--test');

if (!USER || !PASS) { console.error('Defina SANKHYA_USERNAME e SANKHYA_PASSWORD.'); process.exit(1); }

const dec = (buf) => new TextDecoder('iso-8859-1').decode(buf);

async function svc(serviceName, requestBody, session) {
  const url = new URL(BASE.replace(/\/$/, '') + '/service.sbr');
  url.searchParams.set('serviceName', serviceName);
  url.searchParams.set('outputType', 'json');
  url.searchParams.set('output', 'json');
  if (session) url.searchParams.set('mgeSession', session);
  const headers = { 'Content-Type': 'application/json' };
  if (session) headers.Cookie = 'JSESSIONID=' + session;
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ serviceName, requestBody }) });
  const j = JSON.parse(dec(await r.arrayBuffer()) || '{}');
  if (j.status != null && String(j.status) !== '1') throw new Error(serviceName + ': ' + (j.statusMessage || 'status ' + j.status));
  return j;
}

async function login() {
  const j = await svc('MobileLoginSP.login', { NOMUSU: { $: USER }, INTERNO: { $: PASS } });
  const s = j?.responseBody?.jsessionid?.$;
  if (!s) throw new Error('login sem jsessionid');
  return s;
}

async function loadAll(rootEntity, fieldList, expression, session) {
  const out = [];
  for (let page = 0; page < 200; page++) {
    const dataSet = { rootEntity, includePresentationFields: 'N', offsetPage: String(page), entity: { fieldset: { list: fieldList } } };
    if (expression) dataSet.criteria = { expression: { $: expression } };
    const j = await svc('CRUDServiceProvider.loadRecords', { dataSet }, session);
    const ents = j?.responseBody?.entities;
    let arr = ents && ents.entity ? ents.entity : [];
    if (!Array.isArray(arr)) arr = [arr];
    const fields = fieldList.split(',');
    for (const e of arr) { const o = {}; fields.forEach((fn, i) => { const c = e['f' + i]; o[fn] = c != null ? c.$ : undefined; }); out.push(o); }
    if (!ents || String(ents.hasMoreResult) !== 'true' || arr.length === 0) break;
  }
  return out;
}

(async () => {
  try {
    process.stdout.write('Conectando ao Sankhya... ');
    const session = await login();
    console.log('login OK ✅');

    process.stdout.write('Lendo estoque (loadRecords)... ');
    const est = await loadAll('Estoque', 'CODPROD,CODEMP,CODLOCAL,ESTOQUE,RESERVADO', 'this.ESTOQUE > 0', session);
    console.log(est.length + ' registros ✅');
    const rows = est.map((r) => ({ codprod: String(r.CODPROD || '').trim(), saldo: (Number(r.ESTOQUE) || 0) - (Number(r.RESERVADO) || 0) }));

    if (TEST) {
      console.log('\n=== ESTE COMPUTADOR CONSEGUE LER O SANKHYA! ===\n');
      console.log('Amostra de estoque (codprod / saldo):');
      rows.slice(0, 20).forEach((r) => console.log('  ' + r.codprod + '  ->  ' + r.saldo));
      // descobre os CODPROD dos nossos produtos (p/ o mapeamento)
      console.log('\nProdutos (para o mapeamento):');
      for (const termo of ['BESOURO', 'FORMIG', 'SEGWAY', 'JOANINHA']) {
        const p = await loadAll('Produto', 'CODPROD,REFERENCIA,DESCRPROD', `upper(this.DESCRPROD) like '%${termo}%'`, session);
        p.forEach((x) => console.log('  ' + String(x.CODPROD).padEnd(8) + (x.DESCRPROD || '')));
      }
      console.log('\n>> Copie e me mande esta saída. <<');
      return;
    }

    const url = process.env.SANKHYA_INGEST_URL, secret = process.env.SANKHYA_INGEST_SECRET;
    if (!url || !secret) { console.error('Defina SANKHYA_INGEST_URL e SANKHYA_INGEST_SECRET (ou use --test).'); process.exit(1); }
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', authorization: 'Bearer ' + secret }, body: JSON.stringify({ rows }) });
    console.log('Enviado ao InCiclo:', r.status, r.ok ? '✅' : await r.text().catch(() => ''));
  } catch (e) {
    console.error('\n❌ FALHOU:', e.message);
    if (/externas|Bearer|Autenticador/i.test(e.message)) {
      console.error('\n>> Este computador é tratado como EXTERNO pelo Sankhya (precisaria de máquina interna/VPN da CicloWay).');
    }
    process.exit(2);
  }
})();

// Cliente do RD Station MARKETING (API v2, OAuth2). Monta a "foto" do funil de LEADS.
// Fluxo: client_id + client_secret + refresh_token  ->  access_token (validade ~24h)
//        access_token  ->  segmentações  ->  contagem de contatos por etapa.
const AUTH_URL = 'https://api.rd.services/auth/token';
const BASE = 'https://api.rd.services';

// POST /auth/token — usado tanto para trocar o "code" (1ª autorização) quanto para dar refresh.
async function tokenRequest(payload) {
  const r = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const e = new Error('RD auth ' + r.status);
    e.status = r.status; e.body = body.slice(0, 300);
    throw e;
  }
  return r.json();
}

// Troca o refresh_token por um access_token de curta duração. Devolve o JSON completo
// (pode conter um refresh_token rotacionado, que o chamador deve persistir).
export async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const j = await tokenRequest({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken });
  if (!j.access_token) { const e = new Error('RD auth sem access_token'); e.status = 502; throw e; }
  return j;
}

// Troca o "code" da autorização (1ª conexão) por access_token + refresh_token.
export async function exchangeCode({ clientId, clientSecret, code }) {
  const j = await tokenRequest({ client_id: clientId, client_secret: clientSecret, code });
  if (!j.refresh_token) { const e = new Error('RD auth sem refresh_token'); e.status = 502; e.body = JSON.stringify(j).slice(0, 300); throw e; }
  return j;
}

// Persistência do refresh_token (tabela integration_token).
export async function getStoredRefresh(sql) {
  try { const r = await sql`select value from integration_token where key = 'rd_mkt_refresh' limit 1`; return r[0]?.value || null; }
  catch { return null; }
}
export async function setStoredRefresh(sql, token) {
  await sql`insert into integration_token (key, value, updated_at) values ('rd_mkt_refresh', ${token}, now())
            on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

async function rdGet(path, accessToken, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const e = new Error('RD API ' + r.status);
    e.status = r.status; e.body = body.slice(0, 300);
    throw e;
  }
  return r.json();
}

// Lista todas as segmentações da conta (paginado).
async function listSegmentations(accessToken) {
  const out = [];
  let page = 1;
  const SIZE = 125, MAX_PAGES = 20;
  while (page <= MAX_PAGES) {
    const d = await rdGet('/platform/segmentations', accessToken, { page, page_size: SIZE });
    const arr = (d && (d.segmentations || d.items)) || [];
    out.push(...arr);
    if (arr.length < SIZE || arr.length === 0) break;
    page++;
  }
  return out;
}

// Conta os contatos de uma segmentação (paginado, com teto de segurança).
async function countSegmentationContacts(accessToken, id) {
  let total = 0, page = 1;
  const SIZE = 125, MAX_PAGES = 80; // teto ~10.000 contatos por etapa
  while (page <= MAX_PAGES) {
    const d = await rdGet(`/platform/segmentations/${id}/contacts`, accessToken, { page, page_size: SIZE });
    const arr = (d && (d.contacts || d.items)) || [];
    total += arr.length;
    if (arr.length < SIZE || arr.length === 0) break;
    page++;
  }
  return total;
}

// Retorna { kind:'leads', stages:[{name,count,value:0}], totalCount, totalValue:0 }.
// stageNames (opcional): nomes exatos das segmentações que representam as etapas do funil,
// na ordem desejada. Se vazio, mostra TODAS as segmentações da conta.
export async function fetchLeadFunnel(accessToken, stageNames = []) {
  const segs = await listSegmentations(accessToken);
  const wanted = stageNames.map((s) => s.trim().toLowerCase()).filter(Boolean);

  let chosen;
  if (wanted.length) {
    // preserva a ordem informada em RD_MKT_STAGES
    chosen = wanted
      .map((w) => segs.find((s) => (s.name || '').trim().toLowerCase() === w))
      .filter(Boolean);
  } else {
    chosen = segs;
  }

  const stages = [];
  let totalCount = 0;
  for (const seg of chosen) {
    const count = await countSegmentationContacts(accessToken, seg.id);
    stages.push({ name: seg.name, count, value: 0 });
    totalCount += count;
  }
  return { kind: 'leads', stages, totalCount, totalValue: 0 };
}

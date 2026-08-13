// Cliente do RD Station CRM (API v1). Monta a "foto" do funil de vendas.
const BASE = 'https://crm.rdstation.com/api/v1';

async function rdGet(path, token, params = {}) {
  const url = new URL(BASE + path);
  url.searchParams.set('token', token);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const e = new Error('RD API ' + r.status);
    e.status = r.status; e.body = body.slice(0, 300);
    throw e;
  }
  return r.json();
}

// Retorna { stages:[{name,count,value}], totalCount, totalValue } das negociações ABERTAS.
export async function fetchFunnel(token) {
  // 1) Ordem oficial das etapas (opcional — melhora a exibição)
  const order = {};
  try {
    const st = await rdGet('/deal_stages', token, { limit: 200 });
    const arr = Array.isArray(st) ? st : (st.deal_stages || []);
    arr.forEach((s, i) => { if (s && s.name) order[s.name] = (s.order != null ? s.order : i); });
  } catch { /* sem ordenação canônica; agrupamos pelas negociações */ }

  // 2) Negociações (paginado). Filtramos as abertas (win == null) no cliente.
  const stages = {};
  let totalCount = 0, totalValue = 0, page = 1;
  const MAX_PAGES = 30; // teto de segurança (~6.000 negociações)
  while (page <= MAX_PAGES) {
    const d = await rdGet('/deals', token, { page, limit: 200 });
    const deals = Array.isArray(d) ? d : (d.deals || []);
    for (const deal of deals) {
      if (deal.win !== null && deal.win !== undefined) continue; // só abertas
      const name = (deal.deal_stage && (deal.deal_stage.name || deal.deal_stage.nickname)) || 'Sem etapa';
      const val = parseFloat(deal.amount_total ?? deal.amount_montly ?? deal.amount_unique ?? 0) || 0;
      if (!stages[name]) stages[name] = { name, count: 0, value: 0 };
      stages[name].count++; stages[name].value += val;
      totalCount++; totalValue += val;
    }
    const hasMore = Array.isArray(d) ? deals.length === 200 : !!d.has_more;
    if (!hasMore || deals.length === 0) break;
    page++;
  }

  const list = Object.values(stages).sort((a, b) =>
    ((order[a.name] ?? 999) - (order[b.name] ?? 999)) || (b.count - a.count));
  return { stages: list, totalCount, totalValue: Math.round(totalValue) };
}

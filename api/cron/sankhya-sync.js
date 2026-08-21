import { db, readSessionCookie, verifySession } from '../../lib/auth.js';
import { fetchStock, DEFAULT_BASE } from '../../lib/sankhya.js';

// Sincroniza o saldo de estoque do Sankhya e grava um snapshot no Neon.
// Autorizado por: (a) cron da Vercel (Authorization: Bearer CRON_SECRET) ou (b) admin logado (botão).
export default async function handler(req, res) {
  let authed = false, via = '';
  const secret = process.env.CRON_SECRET;
  const hdr = req.headers.authorization || '';
  if (secret && hdr === 'Bearer ' + secret) { authed = true; via = 'cron'; }
  if (!authed) {
    try {
      const token = readSessionCookie(req);
      const s = token ? await verifySession(token) : null;
      if (s && s.role === 'admin') { authed = true; via = 'admin'; }
    } catch { /* ignore */ }
  }
  if (!authed) return res.status(401).json({ error: 'unauthorized' });

  const cfg = {
    base: process.env.SANKHYA_BASE_URL || DEFAULT_BASE,
    username: process.env.SANKHYA_USERNAME,
    password: process.env.SANKHYA_PASSWORD,
  };
  if (!cfg.username || !cfg.password) {
    return res.status(503).json({ error: 'not_configured', message: 'Faltam credenciais do Sankhya (SANKHYA_USERNAME / SANKHYA_PASSWORD).' });
  }

  // Mapa productId(InCiclo) → CODPROD(Sankhya). Sem ele, não há como casar os produtos.
  let map = {};
  try { map = JSON.parse(process.env.SANKHYA_MAP || '{}'); } catch { map = {}; }
  const low = parseInt(process.env.SANKHYA_LOW || '2', 10);

  try {
    const rows = await fetchStock(cfg);
    const byCod = {};
    for (const [pid, cod] of Object.entries(map)) byCod[String(cod).trim()] = pid;

    const items = {};
    for (const r of rows) {
      const pid = byCod[r.codprod];
      if (!pid) continue;
      if (!items[pid]) items[pid] = { qtd: 0 };
      items[pid].qtd += r.saldo;
    }
    for (const pid of Object.keys(items)) {
      const q = items[pid].qtd;
      items[pid].status = q <= 0 ? 'out' : (q <= low ? 'low' : 'ok');
    }

    const payload = { items, rowsCount: rows.length, mapped: Object.keys(items).length };
    const sql = db();
    await sql`insert into stock_snapshot (source, payload) values ('sankhya', ${JSON.stringify(payload)}::jsonb)`;
    return res.status(200).json({ ok: true, via, ...payload });
  } catch (e) {
    console.error('sankhya-sync error:', e?.status, e?.message, e?.body);
    if (e?.status === 401 || e?.status === 403) return res.status(502).json({ error: 'sankhya_auth', message: 'Credenciais do Sankhya inválidas.' });
    return res.status(502).json({ error: 'sankhya_error', message: 'Falha ao consultar o Sankhya.' });
  }
}

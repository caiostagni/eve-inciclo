import { db, readSessionCookie, verifySession } from '../../lib/auth.js';
import { fetchFunnel } from '../../lib/rdstation.js';

// Sincroniza o funil do RD Station e grava um snapshot no Neon.
// Autorizado por: (a) cron da Vercel (Authorization: Bearer CRON_SECRET) ou (b) admin logado (botão "Atualizar agora").
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

  const rdToken = process.env.RD_CRM_TOKEN;
  if (!rdToken) return res.status(503).json({ error: 'not_configured', message: 'Falta configurar RD_CRM_TOKEN.' });

  try {
    const funnel = await fetchFunnel(rdToken);
    const sql = db();
    await sql`insert into funnel_snapshot (source, payload) values ('rd-crm', ${JSON.stringify(funnel)}::jsonb)`;
    return res.status(200).json({ ok: true, via, ...funnel });
  } catch (e) {
    console.error('rd-sync error:', e?.status, e?.message, e?.body);
    if (e?.status === 401) return res.status(502).json({ error: 'rd_auth', message: 'Token do RD Station inválido.' });
    return res.status(502).json({ error: 'rd_error', message: 'Falha ao consultar o RD Station.' });
  }
}

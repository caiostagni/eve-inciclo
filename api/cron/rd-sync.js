import { db, readSessionCookie, verifySession } from '../../lib/auth.js';
import { getAccessToken, fetchLeadFunnel } from '../../lib/rdstation.js';

// Sincroniza o funil de LEADS do RD Station Marketing e grava um snapshot no Neon.
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

  const clientId = process.env.RD_MKT_CLIENT_ID;
  const clientSecret = process.env.RD_MKT_CLIENT_SECRET;
  const refreshToken = process.env.RD_MKT_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'Faltam credenciais do RD Marketing (RD_MKT_CLIENT_ID, RD_MKT_CLIENT_SECRET, RD_MKT_REFRESH_TOKEN).',
    });
  }

  const stageNames = (process.env.RD_MKT_STAGES || '').split(',').map((s) => s.trim()).filter(Boolean);

  try {
    const accessToken = await getAccessToken({ clientId, clientSecret, refreshToken });
    const funnel = await fetchLeadFunnel(accessToken, stageNames);
    const sql = db();
    await sql`insert into funnel_snapshot (source, payload) values ('rd-marketing', ${JSON.stringify(funnel)}::jsonb)`;
    return res.status(200).json({ ok: true, via, ...funnel });
  } catch (e) {
    console.error('rd-sync error:', e?.status, e?.message, e?.body);
    if (e?.status === 401) return res.status(502).json({ error: 'rd_auth', message: 'Credenciais do RD Marketing inválidas ou expiradas.' });
    return res.status(502).json({ error: 'rd_error', message: 'Falha ao consultar o RD Station Marketing.' });
  }
}

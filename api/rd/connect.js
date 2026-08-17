import { readSessionCookie, verifySession } from '../../lib/auth.js';

// Inicia a autorização OAuth do RD Marketing: redireciona o admin para a tela de consentimento.
const REDIRECT = process.env.RD_MKT_REDIRECT || 'https://eve-inciclo.vercel.app/api/rd/callback';

export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let s = null;
  try { if (token) s = await verifySession(token); } catch { s = null; }
  if (!s || s.role !== 'admin') return res.status(403).send('Acesso restrito a administradores.');

  const clientId = process.env.RD_MKT_CLIENT_ID;
  if (!clientId) return res.status(503).send('Falta configurar RD_MKT_CLIENT_ID na Vercel.');

  const url = 'https://api.rd.services/auth/dialog'
    + '?client_id=' + encodeURIComponent(clientId)
    + '&redirect_uri=' + encodeURIComponent(REDIRECT);
  res.writeHead(302, { Location: url });
  res.end();
}

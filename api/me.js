import { db, readSessionCookie, verifySession, perfilPorId } from '../lib/auth.js';

// Restaura a sessão: valida o cookie httpOnly e devolve o perfil atual.
export default async function handler(req, res) {
  try {
    const token = readSessionCookie(req);
    if (!token) return res.status(401).json({ error: 'no_session' });

    let payload;
    try { payload = await verifySession(token); }
    catch { return res.status(401).json({ error: 'invalid_session' }); }

    const sql = db();
    const profile = await perfilPorId(sql, payload.sub);
    if (!profile) return res.status(401).json({ error: 'user_not_found' });

    return res.status(200).json({ profile });
  } catch (e) {
    console.error('me error:', e);
    return res.status(500).json({ error: 'server_error' });
  }
}

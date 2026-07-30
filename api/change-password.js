import bcrypt from 'bcryptjs';
import { db, readSessionCookie, verifySession } from '../lib/auth.js';

// Troca de senha do próprio usuário (exige a senha atual).
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }

  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const cur = String(b.currentPassword || '');
    const nw = String(b.newPassword || '');
    if (!cur || !nw) return res.status(400).json({ error: 'missing_fields' });
    if (nw.length < 6) return res.status(400).json({ error: 'weak_password' });

    const sql = db();
    const rows = await sql`select password_hash from users where id = ${session.sub} and ativo = true limit 1`;
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'user_not_found' });

    const ok = await bcrypt.compare(cur, u.password_hash);
    if (!ok) return res.status(403).json({ error: 'wrong_current' });

    const hash = await bcrypt.hash(nw, 10);
    await sql`update users set password_hash = ${hash} where id = ${session.sub}`;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('change-password error:', e);
    return res.status(500).json({ error: 'server_error' });
  }
}

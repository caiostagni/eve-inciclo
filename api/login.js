import bcrypt from 'bcryptjs';
import { db, signSession, sessionCookie, perfilPorId } from '../lib/auth.js';

// Hash "dummy" gerado uma vez (válido por construção). Serve para rodar um
// bcrypt.compare mesmo quando o e-mail não existe, mantendo o tempo de
// resposta parecido entre "e-mail existe" e "não existe".
let dummyHashP;
const getDummy = () => (dummyHashP ??= bcrypt.hash('inciclo-dummy-password', 10));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });

    const sql = db();
    const rows = await sql`
      select id, password_hash from users
      where email = ${email} and ativo = true limit 1`;
    const u = rows[0];

    // Sempre roda um bcrypt.compare (tempo parecido entre existe/não existe).
    const ok = await bcrypt.compare(password, u ? u.password_hash : await getDummy());
    if (!u || !ok) return res.status(401).json({ error: 'invalid_credentials' });

    const profile = await perfilPorId(sql, u.id);
    const token = await signSession({ sub: u.id, role: profile.role });

    res.setHeader('Set-Cookie', sessionCookie(token, req));
    return res.status(200).json({ profile });
  } catch (e) {
    console.error('login error:', e);
    return res.status(500).json({ error: 'server_error' });
  }
}

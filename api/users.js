import bcrypt from 'bcryptjs';
import { db, readSessionCookie, verifySession, iniciais } from '../lib/auth.js';

// Gestão de usuários — SOMENTE admin. GET lista · POST cria · PATCH ativa/desativa/muda papel.
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

  const sql = db();
  try {
    if (req.method === 'GET') {
      const rows = await sql`select id, email, nome, iniciais, role, dept, ativo from users order by ativo desc, nome asc`;
      return res.status(200).json({ users: rows });
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const email = String(b.email || '').trim().toLowerCase();
      const senha = String(b.senha || '');
      const nome = String(b.nome || '').trim();
      const role = ['admin', 'employee'].includes(b.role) ? b.role : 'employee';
      const dept = String(b.dept || '').trim() || null;
      if (!email || !senha || !nome) return res.status(400).json({ error: 'missing_fields' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'invalid_email' });
      if (senha.length < 6) return res.status(400).json({ error: 'weak_password' });

      const hash = await bcrypt.hash(senha, 10);
      const ini = iniciais(nome);
      const rows = await sql`
        insert into users (email, password_hash, nome, iniciais, role, dept)
        values (${email}, ${hash}, ${nome}, ${ini}, ${role}, ${dept})
        on conflict (email) do nothing
        returning id, email, nome, iniciais, role, dept, ativo`;
      if (rows.length === 0) return res.status(409).json({ error: 'email_exists' });
      return res.status(200).json({ user: rows[0] });
    }

    if (req.method === 'PATCH') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const id = String(b.id || '');
      if (!id) return res.status(400).json({ error: 'missing_id' });
      // impede o admin de se auto-desativar ou se rebaixar
      if (id === session.sub && (b.ativo === false || b.role === 'employee'))
        return res.status(400).json({ error: 'cannot_change_self' });
      if (typeof b.ativo === 'boolean') await sql`update users set ativo = ${b.ativo} where id = ${id}`;
      if (['admin', 'employee'].includes(b.role)) await sql`update users set role = ${b.role} where id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('users error:', e);
    return res.status(500).json({ error: 'server_error' });
  }
}

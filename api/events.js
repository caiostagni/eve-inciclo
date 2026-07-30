import { db, readSessionCookie, verifySession } from '../lib/auth.js';

// Agenda: GET lista (qualquer logado) · POST/DELETE só admin.
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });

  const sql = db();
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        select id, to_char(dt,'YYYY-MM-DD') as dt, nm, tm, tp
        from events order by dt asc, tm asc nulls first`;
      return res.status(200).json({ events: rows });
    }

    if (session.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const dt = String(b.dt || '').trim();
      const nm = String(b.nm || '').trim();
      const tm = b.tm ? String(b.tm).trim() : null;
      const tp = ['m', 'h', 'e', 't'].includes(b.tp) ? b.tp : 'e';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || !nm) return res.status(400).json({ error: 'missing_fields' });
      const rows = await sql`
        insert into events (dt, nm, tm, tp) values (${dt}, ${nm}, ${tm}, ${tp})
        returning id, to_char(dt,'YYYY-MM-DD') as dt, nm, tm, tp`;
      return res.status(200).json({ event: rows[0] });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || '';
      if (!id) return res.status(400).json({ error: 'missing_id' });
      await sql`delete from events where id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('events error:', e);
    return res.status(500).json({ error: 'server_error' });
  }
}

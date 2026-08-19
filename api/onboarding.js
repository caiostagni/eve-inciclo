import { db, readSessionCookie, verifySession } from '../lib/auth.js';
import { ONB_ITEMS, ONB_MANDATORY, ONB_KEYS, CONCLUDED_KEY } from '../lib/onboarding.js';

// Onboarding: progresso do próprio colaborador + painel RH (admin). Só logado.
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });

  const sql = db();
  const uid = session.sub;
  const isAdmin = session.role === 'admin';

  try {
    if (req.method === 'GET') {
      // Painel RH: status de todos (admin)
      if (req.query?.all && isAdmin) {
        const rows = await sql`
          select u.id, u.nome, u.dept,
                 count(p.item_key) filter (where p.item_key <> ${CONCLUDED_KEY}) as done,
                 max(case when p.item_key = ${CONCLUDED_KEY} then p.done_at end) as concluded_at
          from users u left join onboarding_progress p on p.user_id = u.id
          where u.ativo = true
          group by u.id, u.nome, u.dept
          order by u.nome`;
        return res.status(200).json({
          items: ONB_ITEMS, mandatoryCount: ONB_MANDATORY.length, totalItems: ONB_ITEMS.length,
          users: rows.map((r) => ({
            id: r.id, nome: r.nome, dept: r.dept, done: Number(r.done) || 0,
            concluded: !!r.concluded_at,
            concludedAt: r.concluded_at ? new Date(r.concluded_at).toLocaleDateString('pt-BR') : null,
          })),
        });
      }
      // Progresso do próprio usuário
      const rows = await sql`select item_key, done_at from onboarding_progress where user_id = ${uid}`;
      const done = rows.filter((r) => r.item_key !== CONCLUDED_KEY).map((r) => r.item_key);
      const concl = rows.find((r) => r.item_key === CONCLUDED_KEY);
      return res.status(200).json({
        items: ONB_ITEMS,
        done,
        concluded: !!concl,
        concludedAt: concl ? new Date(concl.done_at).toLocaleDateString('pt-BR') : null,
      });
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // Concluir onboarding: exige todos os obrigatórios marcados
      if (b.action === 'conclude') {
        const rows = await sql`select item_key from onboarding_progress where user_id = ${uid}`;
        const doneSet = new Set(rows.map((r) => r.item_key));
        const faltando = ONB_MANDATORY.filter((k) => !doneSet.has(k));
        if (faltando.length) return res.status(400).json({ error: 'incomplete', faltando });
        await sql`insert into onboarding_progress (user_id, item_key) values (${uid}, ${CONCLUDED_KEY})
                  on conflict (user_id, item_key) do nothing`;
        return res.status(200).json({ ok: true, concluded: true });
      }

      // Marcar / desmarcar um item
      const key = String(b.item_key || '');
      if (!ONB_KEYS.includes(key)) return res.status(400).json({ error: 'invalid_item' });
      if (b.done === false) {
        // desmarcar um item também reabre o onboarding (não pode estar concluído sem o obrigatório)
        await sql`delete from onboarding_progress where user_id = ${uid} and item_key in (${key}, ${CONCLUDED_KEY})`;
      } else {
        await sql`insert into onboarding_progress (user_id, item_key) values (${uid}, ${key})
                  on conflict (user_id, item_key) do nothing`;
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('onboarding error:', e?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}

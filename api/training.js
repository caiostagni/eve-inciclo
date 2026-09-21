import { db, readSessionCookie, verifySession } from '../lib/auth.js';
import { publicTrainings, grade, getTraining } from '../lib/trainings.js';

// Treinamentos + avaliações. Correção server-side (gabarito nunca vai ao browser).
// GET            -> treinamentos (sem gabarito) + meu progresso
// GET ?all=1     -> painel RH (admin): quem fez / nota / aprovado + dissertativas
// POST {id,answers,essays} -> corrige, grava melhor resultado, devolve {score,passed}
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
      // Painel RH
      if (req.query?.all && isAdmin) {
        const rows = await sql`
          select u.id, u.nome, u.dept, t.training_id, t.score, t.passed, t.attempts, t.essays, t.submitted_at
          from users u
          left join training_progress t on t.user_id = u.id
          where u.ativo = true
          order by u.nome`;
        const byUser = {};
        for (const r of rows) {
          if (!byUser[r.id]) byUser[r.id] = { id: r.id, nome: r.nome, dept: r.dept, trainings: {} };
          if (r.training_id) {
            byUser[r.id].trainings[r.training_id] = {
              score: r.score, passed: r.passed, attempts: r.attempts, essays: r.essays || [],
              submittedAt: r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('pt-BR') : null,
            };
          }
        }
        return res.status(200).json({ trainings: publicTrainings(), users: Object.values(byUser) });
      }
      // Progresso do próprio usuário
      const rows = await sql`select training_id, score, passed, attempts from training_progress where user_id = ${uid}`;
      const progress = {};
      for (const r of rows) progress[r.training_id] = { score: r.score, passed: r.passed, attempts: r.attempts };
      return res.status(200).json({ trainings: publicTrainings(), progress });
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const id = String(b.id || '');
      const t = getTraining(id);
      if (!t) return res.status(400).json({ error: 'invalid_training' });

      const answers = Array.isArray(b.answers) ? b.answers : [];
      const result = grade(id, answers);

      // Dissertativas: exige texto em todas (guardadas para o RH, não entram na nota).
      const essays = [];
      let faltaEssay = false;
      t.questions.forEach((q, i) => {
        if (!q.dissertativa) return;
        const a = String(answers[i] || '').trim();
        if (!a) faltaEssay = true;
        essays.push({ q: q.q, a });
      });
      if (faltaEssay) return res.status(400).json({ error: 'essay_required' });

      // Grava melhor resultado (nunca rebaixa um passed já obtido).
      await sql`
        insert into training_progress (user_id, training_id, score, passed, attempts, essays, submitted_at)
        values (${uid}, ${id}, ${result.score}, ${result.passed}, 1, ${JSON.stringify(essays)}::jsonb, now())
        on conflict (user_id, training_id) do update set
          score = greatest(training_progress.score, excluded.score),
          passed = training_progress.passed or excluded.passed,
          attempts = training_progress.attempts + 1,
          essays = excluded.essays,
          submitted_at = now()`;

      return res.status(200).json({ ok: true, ...result });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('training error:', e?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}

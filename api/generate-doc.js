import { Packer } from 'docx';
import { readSessionCookie, verifySession } from '../lib/auth.js';
import { getType, buildContractDoc } from '../lib/doc-templates.js';

// Gera a Ficha de Contratação (.docx) a partir dos campos preenchidos. Só logado.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }

  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const type = getType(String(body.tipo || ''));
    if (!type) return res.status(400).json({ error: 'invalid_type' });

    const values = {};
    for (const f of type.fields) values[f.key] = String((body.fields && body.fields[f.key]) || '').slice(0, 2000).trim();
    const faltando = type.fields.filter(f => f.req && !values[f.key]).map(f => f.label);
    if (faltando.length) return res.status(400).json({ error: 'missing_fields', faltando });

    const data = new Date().toLocaleDateString('pt-BR');
    const autor = body.autor ? String(body.autor).slice(0, 80) : '';
    const doc = buildContractDoc(type, values, { data, autor });
    const buf = await Packer.toBuffer(doc);

    const slug = type.id.replace(/[^a-z0-9-]/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="ficha-contratacao-${slug}.docx"`);
    return res.status(200).end(buf);
  } catch (e) {
    console.error('generate-doc error:', e?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}

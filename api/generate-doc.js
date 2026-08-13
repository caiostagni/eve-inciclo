import { Packer } from 'docx';
import { readSessionCookie, verifySession } from '../lib/auth.js';
import { getProposalType, buildProposalDoc } from '../lib/doc-templates.js';
import { getOfficial, officialFormsPublic, fillContract } from '../lib/contract-fill.js';

// Gera documentos (.docx). Só logado.
//  GET  → metadados dos formulários de contrato oficial (para o front montar a tela)
//  POST → gera: kind 'contrato-oficial' (modelo oficial preenchido) | 'proposta' (proposta comercial)
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });

  if (req.method === 'GET') {
    return res.status(200).json({ contracts: officialFormsPublic() });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method_not_allowed' }); }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const kind = String(body.kind || 'contrato-oficial');
    const autor = body.autor ? String(body.autor).slice(0, 80) : '';

    // ── Proposta comercial (documento montado do zero) ──
    if (kind === 'proposta') {
      const type = getProposalType(String(body.tipo || ''));
      if (!type) return res.status(400).json({ error: 'invalid_type' });
      const values = {};
      for (const f of type.fields) values[f.key] = String((body.fields && body.fields[f.key]) || '').slice(0, 2000).trim();
      const faltando = type.fields.filter(f => f.req && !values[f.key]).map(f => f.label);
      if (faltando.length) return res.status(400).json({ error: 'missing_fields', faltando });
      const data = new Date().toLocaleDateString('pt-BR');
      const buf = await Packer.toBuffer(buildProposalDoc(type, values, { data, autor }));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="proposta-comercial-${type.id}.docx"`);
      return res.status(200).end(buf);
    }

    // ── Contrato oficial (modelo .docx do jurídico preenchido) ──
    const type = getOfficial(String(body.tipo || ''));
    if (!type) return res.status(400).json({ error: 'invalid_type' });

    const values = {};
    for (const f of type.fields) {
      values[f.key] = String((body.fields && body.fields[f.key]) || '').slice(0, 2000).trim();
    }
    const faltando = type.fields.filter(f => f.default === undefined && !values[f.key]).map(f => f.label);
    if (faltando.length) return res.status(400).json({ error: 'missing_fields', faltando });

    const count = type.checkboxes?.count || 0;
    const marks = Array.isArray(body.marks)
      ? [...new Set(body.marks.filter(n => Number.isInteger(n) && n >= 0 && n < count))]
      : [];

    const { buf, faltando: semValor } = await fillContract(type.id, values, marks);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="contrato-${type.id}.docx"`);
    // placeholders que ficaram sem valor (fora os automáticos) vão no header p/ diagnóstico
    if (semValor.length) res.setHeader('X-Campos-Sem-Valor', semValor.join(','));
    return res.status(200).end(buf);
  } catch (e) {
    console.error('generate-doc error:', e?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}

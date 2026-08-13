// Ferramentas (tool use) do assistente InCiclo: gerar contrato e proposta pelo chat.
// O modelo coleta os campos conversando e chama a ferramenta; aqui geramos o .docx.
import { Packer } from 'docx';
import { OFFICIAL_CONTRACTS, getOfficial, fillContract } from './contract-fill.js';
import { PROPOSAL_TYPES, getProposalType, buildProposalDoc } from './doc-templates.js';

const optKeys = (fields) => fields.map(f => (f.default !== undefined ? `${f.key} (opcional)` : f.key)).join(', ');
const propKeys = (fields) => fields.map(f => (f.req ? f.key : `${f.key} (opcional)`)).join(', ');

// Definições das ferramentas (schemas + descrição com as chaves de cada tipo).
export function buildTools() {
  const contratoDesc =
    'Gera o CONTRATO OFICIAL da CicloWay preenchido (.docx). Só chame depois de coletar e confirmar com o colaborador os campos obrigatórios do tipo escolhido. As chaves de `campos` são em MAIÚSCULAS, conforme o tipo:\n' +
    OFFICIAL_CONTRACTS.map((t) => {
      let s = `• ${t.id} — ${t.nm}: ${optKeys(t.fields)}`;
      if (t.checkboxes) {
        s += '\n   marcações (índices em `marcacoes`): ' +
          t.checkboxes.groups.map((g) => `${g.label} [${g.type}]: ` + g.options.map((o) => `${o.i}=${o.label}`).join(', ')).join(' | ');
      }
      return s;
    }).join('\n') +
    '\nNÃO envie dados da CicloWay nem a data (são automáticos). Não invente valores: se faltar algo obrigatório, pergunte antes.';

  const propostaDesc =
    'Gera a PROPOSTA comercial da CicloWay (.docx). Só chame após coletar os campos obrigatórios. Chaves de `campos` por tipo:\n' +
    PROPOSAL_TYPES.map((t) => `• ${t.id} — ${t.nm}: ${propKeys(t.fields)}`).join('\n');

  return [
    {
      name: 'gerar_contrato',
      description: contratoDesc,
      input_schema: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: OFFICIAL_CONTRACTS.map((t) => t.id) },
          campos: { type: 'object', description: 'Mapa CHAVE→valor (strings), chaves em MAIÚSCULAS conforme o tipo.', additionalProperties: { type: 'string' } },
          marcacoes: { type: 'array', items: { type: 'integer' }, description: 'Índices das caixas de seleção a marcar.' },
        },
        required: ['tipo', 'campos'],
      },
    },
    {
      name: 'gerar_proposta',
      description: propostaDesc,
      input_schema: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: PROPOSAL_TYPES.map((t) => t.id) },
          campos: { type: 'object', additionalProperties: { type: 'string' } },
        },
        required: ['tipo', 'campos'],
      },
    },
  ];
}

// Executa a ferramenta. Retorna { file?:{name,b64}, resumo?, error?, semValor? }.
export async function runTool(name, input, autor = '') {
  try {
    if (name === 'gerar_contrato') {
      const t = getOfficial(String(input?.tipo || ''));
      if (!t) return { error: 'tipo de contrato inválido' };
      const values = {};
      for (const f of t.fields) values[f.key] = input?.campos?.[f.key] != null ? String(input.campos[f.key]).slice(0, 2000).trim() : '';
      const faltando = t.fields.filter((f) => f.default === undefined && !values[f.key]).map((f) => f.label);
      if (faltando.length) return { error: 'faltam campos obrigatórios: ' + faltando.join(', ') };
      const count = t.checkboxes?.count || 0;
      const marks = Array.isArray(input?.marcacoes) ? [...new Set(input.marcacoes.filter((n) => Number.isInteger(n) && n >= 0 && n < count))] : [];
      const { buf, faltando: semValor } = await fillContract(t.id, values, marks);
      return { file: { name: `contrato-${t.id}.docx`, b64: buf.toString('base64') }, resumo: `Contrato "${t.nm}" gerado`, semValor };
    }
    if (name === 'gerar_proposta') {
      const t = getProposalType(String(input?.tipo || ''));
      if (!t) return { error: 'tipo de proposta inválido' };
      const values = {};
      for (const f of t.fields) values[f.key] = input?.campos?.[f.key] != null ? String(input.campos[f.key]).slice(0, 2000).trim() : '';
      const faltando = t.fields.filter((f) => f.req && !values[f.key]).map((f) => f.label);
      if (faltando.length) return { error: 'faltam campos obrigatórios: ' + faltando.join(', ') };
      const doc = buildProposalDoc(t, values, { data: new Date().toLocaleDateString('pt-BR'), autor });
      const buf = await Packer.toBuffer(doc);
      return { file: { name: `${t.id}.docx`, b64: buf.toString('base64') }, resumo: `Proposta "${t.nm}" gerada` };
    }
    return { error: 'ferramenta desconhecida' };
  } catch (e) {
    return { error: 'falha ao gerar o documento' };
  }
}

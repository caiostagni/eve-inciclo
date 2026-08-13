// Preenche os modelos OFICIAIS de contrato (.docx com {{CAMPO}}) do jurídico.
// Substitui os placeholders no XML (document/headers/footers) e marca checkboxes ☐→☑.
// Porta em Node da lógica de skills/gerador-contratos-cicloway (todos os {{}} são inteiros
// dentro de um run nos modelos atuais, então a substituição direta é segura).
import JSZip from 'jszip';
import { TEMPLATE_DATA } from './contract-templates-data.js';

const PH = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const xesc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function hoje() {
  const d = new Date();
  const sem = `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  return { DATA_HOJE: `São Paulo, ${sem}`, DATA_HOJE_SEM_CIDADE: sem };
}

// ─── Metadados dos 7 modelos oficiais (fields = perguntas; checkboxes = opções ☐) ───
// (campos com `default` são opcionais/pré-preenchidos; os demais são obrigatórios)
export const OFFICIAL_CONTRACTS = [
  { id:'locacao-padrao', nm:'Locação Padrão (Bem Móvel)', papel:'LOCADORA',
    quando_usar:'Locação B2B de veículos/equipamentos, valor mensal e prazo.',
    fields:[
      {key:'LOCATARIA_RAZAO_SOCIAL', label:'Razão social da locatária', grupo:'Locatária', full:true},
      {key:'LOCATARIA_CNPJ', label:'CNPJ da locatária', grupo:'Locatária', ph:'00.000.000/0000-00'},
      {key:'LOCATARIA_ENDERECO', label:'Endereço da locatária', grupo:'Locatária', full:true},
      {key:'LOCATARIA_CIDADE', label:'Cidade', grupo:'Locatária'},
      {key:'LOCATARIA_ESTADO', label:'Estado (UF)', grupo:'Locatária', ph:'SP'},
      {key:'ENDERECO_ATIVACAO', label:'Endereço do local de ativação', grupo:'Ativação', full:true},
      {key:'VALOR_MENSAL', label:'Valor mensal (R$)', grupo:'Valores', ph:'2.100,00'},
      {key:'VALOR_FRETE', label:'Valor do frete (R$)', grupo:'Valores', default:''},
      {key:'VALOR_TOTAL', label:'Valor total (R$)', grupo:'Valores'},
      {key:'DIA_VENCIMENTO', label:'Dia de vencimento', grupo:'Valores', default:'10'},
      {key:'PRAZO_MESES', label:'Prazo (meses)', grupo:'Prazo', default:'12'},
      {key:'VALOR_VEICULO', label:'Ressarcimento por perda total (R$)', grupo:'Ressarcimento'},
    ]},
  { id:'locacao-pessoa-fisica', nm:'Locação para Pessoa Física', papel:'LOCADORA',
    quando_usar:'Locação de veículos para uso pessoal (PF), com plano e fidelidade.',
    fields:[
      {key:'LOCATARIO_NOME', label:'Nome completo do locatário', grupo:'Locatário', full:true},
      {key:'LOCATARIO_CPF', label:'CPF', grupo:'Locatário'},
      {key:'LOCATARIO_RG', label:'RG', grupo:'Locatário'},
      {key:'LOCATARIO_ENDERECO', label:'Endereço', grupo:'Locatário', full:true},
      {key:'LOCATARIO_TELEFONE', label:'Telefone', grupo:'Locatário'},
      {key:'LOCATARIO_EMAIL', label:'E-mail', grupo:'Locatário'},
      {key:'MODELO', label:'Modelo do veículo', grupo:'Objeto'},
      {key:'QTD', label:'Quantidade', grupo:'Objeto', default:'1'},
      {key:'PLANO', label:'Plano contratado', grupo:'Plano'},
      {key:'VALOR_MENSAL', label:'Valor mensal (R$)', grupo:'Plano'},
      {key:'VIGENCIA', label:'Prazo/vigência', grupo:'Plano'},
      {key:'DIA_VENCIMENTO', label:'Dia de vencimento', grupo:'Plano', default:'10'},
      {key:'OUTROS_ITENS', label:'Outros itens entregues (descrever)', grupo:'Itens', full:true, default:''},
      {key:'PRAZO_FIDELIDADE', label:'Prazo de fidelidade (meses)', grupo:'Cancelamento'},
    ],
    checkboxes:{ count:7, groups:[
      { label:'Veículo entregue com', type:'multi', options:[
        {i:0,label:'Carregador'},{i:1,label:'Bateria'},{i:2,label:'Chave da bateria'},
        {i:3,label:'Luz frontal'},{i:4,label:'Luz traseira'},{i:5,label:'Cadeado'},{i:6,label:'Outros'} ] },
    ]}},
  { id:'compra-e-venda', nm:'Compra e Venda', papel:'VENDEDOR',
    quando_usar:'Venda de veículos (novos ou seminovos) para PF ou PJ.',
    fields:[
      {key:'COMPRADOR_NOME', label:'Comprador (razão social ou nome)', grupo:'Comprador', full:true},
      {key:'COMPRADOR_DOC', label:'CPF ou CNPJ do comprador', grupo:'Comprador'},
      {key:'COMPRADOR_ENDERECO', label:'Endereço do comprador', grupo:'Comprador', full:true},
      {key:'QTD', label:'Quantidade', grupo:'Objeto'},
      {key:'MODELO', label:'Modelo do veículo', grupo:'Objeto'},
      {key:'VALOR_UNITARIO', label:'Valor unitário (R$)', grupo:'Valores'},
      {key:'VALOR_TOTAL', label:'Valor total (R$)', grupo:'Valores'},
    ],
    checkboxes:{ count:4, groups:[
      { label:'Condição do veículo', type:'radio', options:[{i:0,label:'Veículo Novo'},{i:1,label:'Veículo Seminovo'}] },
      { label:'Emplacamento', type:'radio', options:[{i:2,label:'Emplacamento em nome do comprador'},{i:3,label:'Sem emplacamento'}] },
    ]}},
  { id:'demonstracao-comodato', nm:'Demonstração e Comodato', papel:'COMODANTE',
    quando_usar:'Empréstimo gratuito (comodato) para demonstração/teste por um período.',
    fields:[
      {key:'COMODATARIA_RAZAO_SOCIAL', label:'Razão social da comodatária', grupo:'Comodatária', full:true},
      {key:'COMODATARIA_CNPJ', label:'CNPJ', grupo:'Comodatária'},
      {key:'COMODATARIA_ENDERECO', label:'Endereço', grupo:'Comodatária', full:true},
      {key:'COMODATARIA_CIDADE', label:'Cidade', grupo:'Comodatária'},
      {key:'COMODATARIA_ESTADO', label:'Estado (UF)', grupo:'Comodatária', ph:'SP'},
      {key:'QTD', label:'Quantidade', grupo:'Objeto'},
      {key:'MODELO', label:'Modelo do veículo', grupo:'Objeto'},
      {key:'VALOR_VEICULO', label:'Ressarcimento por veículo (R$)', grupo:'Ressarcimento'},
      {key:'PRAZO', label:'Prazo de vigência', grupo:'Vigência'},
    ],
    checkboxes:{ count:2, groups:[
      { label:'Responsável pela logística', type:'radio', options:[{i:0,label:'COMODANTE (CicloWay)'},{i:1,label:'COMODATÁRIA (cliente)'}] },
    ]}},
  { id:'aditivo-inclusao-equipamento', nm:'Aditivo — Inclusão de Equipamento', papel:'LOCADORA',
    quando_usar:'Incluir veículos/equipamentos em um contrato de locação existente.',
    fields:[
      {key:'LOCATARIA_RAZAO_SOCIAL', label:'Razão social da locatária', grupo:'Locatária', full:true},
      {key:'LOCATARIA_CNPJ', label:'CNPJ', grupo:'Locatária'},
      {key:'LOCATARIA_ENDERECO', label:'Endereço completo', grupo:'Locatária', full:true},
      {key:'LOCATARIA_CEP', label:'CEP', grupo:'Locatária'},
      {key:'LOCATARIA_CIDADE', label:'Cidade', grupo:'Locatária'},
      {key:'LOCATARIA_ESTADO', label:'Estado (UF)', grupo:'Locatária', ph:'SP'},
      {key:'QTD_INCLUIDA', label:'Quantidade incluída', grupo:'Inclusão'},
      {key:'MODELO_INCLUIDO', label:'Modelo incluído', grupo:'Inclusão'},
      {key:'QTD_TOTAL', label:'Quantidade total após inclusão', grupo:'Consolidado'},
      {key:'MODELO_CONSOLIDADO', label:'Modelo(s) no contrato consolidado', grupo:'Consolidado', full:true},
      {key:'VALOR_UNITARIO', label:'Valor unitário mensal (R$)', grupo:'Valores'},
      {key:'VALOR_MENSAL_CONSOLIDADO', label:'Valor mensal consolidado (R$)', grupo:'Valores'},
      {key:'VALOR_FRETE', label:'Frete ida e volta (R$)', grupo:'Valores', default:''},
    ]},
  { id:'aditivo-reducao-equipamento', nm:'Aditivo — Redução de Equipamento', papel:'LOCADORA',
    quando_usar:'Retirar veículos/equipamentos de um contrato de locação existente.',
    fields:[
      {key:'LOCATARIA_RAZAO_SOCIAL', label:'Razão social da locatária', grupo:'Locatária', full:true},
      {key:'LOCATARIA_CNPJ', label:'CNPJ', grupo:'Locatária'},
      {key:'LOCATARIA_ENDERECO', label:'Endereço', grupo:'Locatária', full:true},
      {key:'QTD_RETIRADA', label:'Quantidade retirada', grupo:'Redução'},
      {key:'MODELO_RETIRADO', label:'Modelo retirado', grupo:'Redução'},
      {key:'QTD_REMANESCENTE', label:'Quantidade remanescente', grupo:'Consolidado'},
      {key:'MODELO_REMANESCENTE', label:'Modelo(s) remanescente(s)', grupo:'Consolidado', full:true},
      {key:'VALOR_UNITARIO', label:'Valor unitário (R$)', grupo:'Valores'},
      {key:'VALOR_CONSOLIDADO', label:'Valor mensal consolidado (R$)', grupo:'Valores'},
    ]},
  { id:'termo-responsabilidade-evento', nm:'Termo de Responsabilidade (Evento)', papel:'LOCADORA',
    quando_usar:'Locação de curta duração para eventos, com datas de início/fim.',
    fields:[
      {key:'LOCATARIA_RAZAO_SOCIAL', label:'Razão social da locatária', grupo:'Locatária', full:true},
      {key:'LOCATARIA_CNPJ', label:'CNPJ', grupo:'Locatária'},
      {key:'LOCATARIA_ENDERECO', label:'Endereço', grupo:'Locatária', full:true},
      {key:'MODELO', label:'Modelo do equipamento', grupo:'Equipamento'},
      {key:'QTD', label:'Quantidade de equipamentos', grupo:'Equipamento'},
      {key:'LOCAL_EVENTO', label:'Local de utilização (evento)', grupo:'Equipamento', full:true},
      {key:'DATA_INICIO', label:'Data de início', grupo:'Período', ph:'DD/MM/AAAA'},
      {key:'DATA_FIM', label:'Data de término', grupo:'Período', ph:'DD/MM/AAAA'},
      {key:'QTD_DIAS', label:'Total de dias', grupo:'Período'},
      {key:'VALOR_LOCACAO', label:'Valor da locação (R$)', grupo:'Valores'},
      {key:'VALOR_FRETE', label:'Valor do frete (R$)', grupo:'Valores', default:''},
      {key:'VALOR_TOTAL', label:'Valor total (R$)', grupo:'Valores'},
    ]},
];

export function getOfficial(id){ return OFFICIAL_CONTRACTS.find(t => t.id === id) || null; }

// Metadados seguros para o front (sem os bytes do .docx).
export function officialFormsPublic(){
  return OFFICIAL_CONTRACTS.map(t => ({ id:t.id, nm:t.nm, quando_usar:t.quando_usar, papel:t.papel, fields:t.fields, checkboxes:t.checkboxes || null }));
}

// Preenche o modelo e devolve { buf, faltando:[...] }. marks = índices das ☐ a marcar.
export async function fillContract(id, values, marks = []) {
  if (!TEMPLATE_DATA[id]) throw new Error('template_nao_encontrado');
  const zip = await JSZip.loadAsync(Buffer.from(TEMPLATE_DATA[id], 'base64'));
  const all = { ...hoje(), ...values };
  const faltando = new Set();

  for (const name of Object.keys(zip.files)) {
    if (!/word\/(document|header\d*|footer\d*)\.xml$/.test(name)) continue;
    let xml = await zip.files[name].async('string');
    xml = xml.replace(PH, (m, key) => {
      // chave conhecida (mesmo vazia) → substitui; desconhecida → mantém {{CAMPO}} p/ preenchimento manual
      if (Object.prototype.hasOwnProperty.call(all, key)) return xesc(all[key] ?? '');
      faltando.add(key);
      return m;
    });
    if (name === 'word/document.xml' && Array.isArray(marks) && marks.length) {
      let idx = -1;
      xml = xml.replace(/☐/g, (ch) => { idx++; return marks.includes(idx) ? '☑' : ch; });
    }
    zip.file(name, xml);
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buf, faltando: [...faltando] };
}

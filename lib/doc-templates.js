// Modelos de contratação: campos por tipo + gerador de documento (.docx).
// A "Ficha de Contratação" reúne todos os dados necessários — documento auxiliar,
// revisável, que alimenta o contrato oficial. Quando o jurídico enviar os modelos
// .docx oficiais, dá para preencher direto o contrato final.
import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

export const CONTRACT_TYPES = [
  { id:'locacao-leves', nm:'Locação — Patinetes e Segways (leves)',
    fields:[
      {key:'contratante', label:'Contratante (razão social)', req:true},
      {key:'cnpj', label:'CNPJ', req:true, ph:'00.000.000/0000-00'},
      {key:'endereco', label:'Endereço de operação', req:true},
      {key:'responsavel', label:'Responsável / contato', req:true},
      {key:'modelos', label:'Modelos e quantidades', req:true, ph:'Ex.: 5× Segway i2, 3× Formigão G3'},
      {key:'prazo', label:'Prazo (meses)', req:true, ph:'Mín. 12'},
      {key:'valor', label:'Valor de locação (R$/mês)', req:false},
      {key:'inicio', label:'Início previsto', req:false},
      {key:'obs', label:'Observações', req:false, area:true},
    ]},
  { id:'locacao-pesados', nm:'Locação — Triciclos e veículos pesados',
    fields:[
      {key:'contratante', label:'Contratante (razão social)', req:true},
      {key:'cnpj', label:'CNPJ', req:true, ph:'00.000.000/0000-00'},
      {key:'local', label:'Local de operação', req:true},
      {key:'responsavel', label:'Responsável / contato', req:true},
      {key:'modelos', label:'Modelos e quantidades', req:true, ph:'Ex.: 4× Besouro Coletor'},
      {key:'prazo', label:'Prazo (meses)', req:true, ph:'Mín. 12'},
      {key:'valor', label:'Valor de locação (R$/mês)', req:false},
      {key:'inicio', label:'Início previsto', req:false},
      {key:'obs', label:'Observações (operação, SLA, reserva)', req:false, area:true},
    ]},
  { id:'venda-b2b', nm:'Venda direta — Frota B2B',
    fields:[
      {key:'contratante', label:'Comprador (razão social)', req:true},
      {key:'cnpj', label:'CNPJ', req:true, ph:'00.000.000/0000-00'},
      {key:'modelos', label:'Modelos e quantidades', req:true},
      {key:'valor', label:'Valor total (R$)', req:false},
      {key:'pagamento', label:'Condição de pagamento', req:true, ph:'Ex.: 6x boleto sem juros'},
      {key:'garantia', label:'Garantia', req:false, ph:'Ex.: 12 meses + estendida'},
      {key:'entrega', label:'Prazo de entrega', req:false},
      {key:'obs', label:'Observações', req:false, area:true},
    ]},
  { id:'publico', nm:'Contrato público — Prefeituras / órgãos',
    fields:[
      {key:'orgao', label:'Órgão / ente público', req:true},
      {key:'cnpj', label:'CNPJ do órgão', req:true},
      {key:'processo', label:'Nº do processo', req:true, ph:'Licitação ou dispensa'},
      {key:'modalidade', label:'Modalidade', req:true, ph:'Pregão, dispensa, etc.'},
      {key:'empenho', label:'Dotação / empenho', req:false},
      {key:'objeto', label:'Objeto', req:true, area:true},
      {key:'vigencia', label:'Prazo de vigência', req:true},
      {key:'fiscal', label:'Fiscal do contrato', req:false},
      {key:'obs', label:'Observações', req:false, area:true},
    ]},
];

export function getType(id){ return CONTRACT_TYPES.find(t=>t.id===id) || null; }

// ─── PROPOSTAS COMERCIAIS ───────────────────────────────────────────────
// Mesma lógica: reúne os dados da proposta em um documento auxiliar (.docx),
// pronto para virar a apresentação/proposta oficial no template do comercial.
export const PROPOSAL_TYPES = [
  { id:'proposta-locacao', nm:'Proposta de Locação de Frota',
    fields:[
      {key:'cliente', label:'Cliente (razão social)', req:true},
      {key:'contato', label:'Contato (nome / cargo)', req:true},
      {key:'segmento', label:'Segmento', req:true, ph:'Shopping, Segurança, Delivery, Coleta…'},
      {key:'veiculos', label:'Veículos e quantidades', req:true, ph:'Ex.: 5× Segway i2, 3× Formigão G3'},
      {key:'prazo', label:'Prazo da locação (meses)', req:true, ph:'Mín. 12'},
      {key:'valor', label:'Investimento (R$/mês)', req:false},
      {key:'inclusos', label:'O que está incluso', req:false, area:true, ph:'Manutenção, bateria reserva, treinamento, seguro…'},
      {key:'validade', label:'Validade da proposta', req:true, ph:'Ex.: 30 dias'},
      {key:'obs', label:'Observações', req:false, area:true},
    ]},
  { id:'proposta-venda', nm:'Proposta de Venda de Frota',
    fields:[
      {key:'cliente', label:'Cliente (razão social)', req:true},
      {key:'contato', label:'Contato (nome / cargo)', req:true},
      {key:'segmento', label:'Segmento', req:true},
      {key:'veiculos', label:'Veículos e quantidades', req:true},
      {key:'valor', label:'Investimento total (R$)', req:false},
      {key:'pagamento', label:'Condição de pagamento', req:true, ph:'Ex.: 6x boleto sem juros'},
      {key:'garantia', label:'Garantia', req:false, ph:'Ex.: 12 meses + estendida'},
      {key:'entrega', label:'Prazo de entrega', req:false},
      {key:'validade', label:'Validade da proposta', req:true, ph:'Ex.: 30 dias'},
      {key:'obs', label:'Observações', req:false, area:true},
    ]},
  { id:'proposta-publico', nm:'Proposta para Órgão Público / Licitação',
    fields:[
      {key:'orgao', label:'Órgão / ente público', req:true},
      {key:'contato', label:'Responsável / contato', req:true},
      {key:'objeto', label:'Objeto', req:true, area:true, ph:'Descrição do fornecimento/locação'},
      {key:'modalidade', label:'Modalidade', req:true, ph:'Pregão, dispensa, etc.'},
      {key:'veiculos', label:'Veículos e quantidades', req:true},
      {key:'valor', label:'Valor estimado (R$)', req:false},
      {key:'vigencia', label:'Prazo de vigência', req:true},
      {key:'validade', label:'Validade da proposta', req:true, ph:'Ex.: 60 dias'},
      {key:'obs', label:'Observações', req:false, area:true},
    ]},
];

export function getProposalType(id){ return PROPOSAL_TYPES.find(t=>t.id===id) || null; }

const BLUE = '003FDE';
function cell(text, {bold=false, w=32, fill}={}) {
  return new TableCell({
    width:{ size:w, type:WidthType.PERCENTAGE },
    shading: fill ? { fill } : undefined,
    margins:{ top:80, bottom:80, left:120, right:120 },
    children:[ new Paragraph({ children:[ new TextRun({ text:text||'—', bold, size:20 }) ] }) ],
  });
}

// Monta o documento .docx da ficha de contratação
export function buildContractDoc(type, values, meta={}) {
  const rows = type.fields.map(f => new TableRow({ children:[
    cell(f.label, { bold:true, w:34, fill:'F2F4F8' }),
    cell(values[f.key], { w:66 }),
  ]}));

  return new Document({
    creator: 'InCiclo — CicloWay',
    title: 'Ficha de Contratação',
    sections:[{
      properties:{ page:{ margin:{ top:900, bottom:900, left:1000, right:1000 } } },
      children:[
        new Paragraph({ children:[ new TextRun({ text:'CicloWay', bold:true, color:BLUE, size:28 }) ] }),
        new Paragraph({ children:[ new TextRun({ text:'Ficha de Contratação', bold:true, size:32 }) ], spacing:{ after:60 } }),
        new Paragraph({ children:[ new TextRun({ text:type.nm, size:22, color:'555555' }) ], spacing:{ after:40 } }),
        new Paragraph({ children:[ new TextRun({ text:`Gerada em ${meta.data||''}${meta.autor?' · '+meta.autor:''}`, size:18, color:'888888' }) ], spacing:{ after:200 } }),
        new Table({ width:{ size:100, type:WidthType.PERCENTAGE }, rows,
          borders:{ top:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, bottom:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, left:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, right:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:'EEEEEE'}, insideVertical:{style:BorderStyle.SINGLE,size:2,color:'EEEEEE'} } }),
        new Paragraph({ spacing:{ before:300 }, children:[ new TextRun({ text:'Documento auxiliar gerado pelo InCiclo para reunir os dados da contratação. O contrato oficial deve ser emitido e revisado pelo jurídico/comercial antes da assinatura.', italics:true, size:16, color:'999999' }) ] }),
      ],
    }],
  });
}

// Monta o documento .docx da proposta comercial
export function buildProposalDoc(type, values, meta={}) {
  const cliente = values.cliente || values.orgao || '';
  const rows = type.fields.map(f => new TableRow({ children:[
    cell(f.label, { bold:true, w:34, fill:'F2F4F8' }),
    cell(values[f.key], { w:66 }),
  ]}));

  return new Document({
    creator: 'InCiclo — CicloWay',
    title: 'Proposta Comercial',
    sections:[{
      properties:{ page:{ margin:{ top:900, bottom:900, left:1000, right:1000 } } },
      children:[
        new Paragraph({ children:[ new TextRun({ text:'CicloWay', bold:true, color:BLUE, size:28 }) ] }),
        new Paragraph({ children:[ new TextRun({ text:'#DescubraOMovimento', size:16, color:'888888' }) ], spacing:{ after:80 } }),
        new Paragraph({ children:[ new TextRun({ text:'Proposta Comercial', bold:true, size:32 }) ], spacing:{ after:60 } }),
        new Paragraph({ children:[ new TextRun({ text:type.nm, size:22, color:'555555' }) ], spacing:{ after:20 } }),
        cliente ? new Paragraph({ children:[ new TextRun({ text:'Para: '+cliente, bold:true, size:22 }) ], spacing:{ after:40 } }) : new Paragraph({ text:'' }),
        new Paragraph({ children:[ new TextRun({ text:`Emitida em ${meta.data||''}${meta.autor?' · '+meta.autor:''}`, size:18, color:'888888' }) ], spacing:{ after:200 } }),
        new Table({ width:{ size:100, type:WidthType.PERCENTAGE }, rows,
          borders:{ top:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, bottom:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, left:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, right:{style:BorderStyle.SINGLE,size:2,color:'DDDDDD'}, insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:'EEEEEE'}, insideVertical:{style:BorderStyle.SINGLE,size:2,color:'EEEEEE'} } }),
        new Paragraph({ spacing:{ before:260, after:40 }, children:[ new TextRun({ text:'Por que a CicloWay', bold:true, size:22, color:BLUE }) ] }),
        new Paragraph({ children:[ new TextRun({ text:'Pioneira em mobilidade elétrica no Brasil desde 2005, com fábrica em Manaus (Zona Franca). Custo operacional até 90% menor que veículos a combustão, +7.000 toneladas de CO₂ evitadas e frota licenciada e homologada.', size:18, color:'555555' }) ], spacing:{ after:200 } }),
        new Paragraph({ children:[ new TextRun({ text:'Documento auxiliar gerado pelo InCiclo para organizar a proposta. Os valores e condições devem ser confirmados pelo comercial antes do envio ao cliente.', italics:true, size:16, color:'999999' }) ] }),
      ],
    }],
  });
}

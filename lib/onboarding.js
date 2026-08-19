// Itens da trilha de onboarding (fonte única — usada pela API e enviada ao front).
// mandatory=true: precisa estar concluído para "Concluir onboarding".
export const ONB_ITEMS = [
  { key: 'welcome',  title: 'Manual de Boas-Vindas',            desc: 'Leia o manual completo: veículos, organograma, processos, uniforme, ferramentas, EPIs e OS.', mandatory: true },
  { key: 'epis',     title: 'EPIs por área (Segurança)',        desc: 'Veja os EPIs obrigatórios da sua área de trabalho. Segurança é prioridade.',                mandatory: true },
  { key: 'conduct',  title: 'Conduta, disciplina e segurança',  desc: 'Declaro que li e concordo com as regras de conduta, disciplinares e de segurança.',          mandatory: true },
  { key: 'org',      title: 'Organograma e time',               desc: 'Conheça as áreas e as pessoas-chave no Organograma do InCiclo.',                             mandatory: false },
  { key: 'systems',  title: 'Sistemas e acessos',               desc: 'E-mail @cicloway, Sankhya, Produtivo — fale com o Altair (T.I.) para os acessos.',           mandatory: false },
  { key: 'training', title: 'Treinamentos da sua área',         desc: 'Complete os módulos relevantes na tela de Treinamentos.',                                    mandatory: false },
];

export const ONB_MANDATORY = ONB_ITEMS.filter((i) => i.mandatory).map((i) => i.key);
export const ONB_KEYS = ONB_ITEMS.map((i) => i.key);
export const CONCLUDED_KEY = '__concluido__';

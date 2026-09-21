// Treinamentos + avaliações. Gabarito e correção ficam no SERVIDOR (nunca vão ao browser).
// Cada treinamento: vídeo (Drive/YouTube embed), materiais e uma avaliação com nota mínima.
// Questões: { q, opts:[...], correct: idxDaCorreta } | { q, dissertativa:true } (não entra na nota).
export const TRAININGS = [
  {
    id: 'atendimento', title: 'Atendimento ao Cliente',
    desc: 'Boas práticas de atendimento, postura e comunicação com o cliente.',
    video: '', materials: [], pass: 70,
    questions: [
      { q: 'Durante um atendimento, o cliente começa a relatar um problema. Qual deve ser sua primeira atitude?', opts: ['Interromper para ganhar tempo.', 'Ouvir atentamente antes de propor qualquer solução.', 'Informar imediatamente o valor do serviço.', 'Solicitar que o cliente envie uma reclamação formal.'], correct: 1 },
      { q: 'Um cliente questiona um procedimento técnico que você executou. O que fazer?', opts: ['Informar que ele não possui conhecimento técnico suficiente.', 'Explicar o procedimento de forma clara e respeitosa.', 'Encerrar a conversa.', 'Ignorar o questionamento.'], correct: 1 },
      { q: 'Qual dos comportamentos abaixo pode prejudicar a imagem da CicloWay?', opts: ['Comunicação clara', 'Organização das ferramentas', 'Linguagem inadequada diante do cliente', 'Explicação dos serviços realizados'], correct: 2 },
      { q: 'Um cliente está irritado devido ao atraso no atendimento. Qual a melhor postura?', opts: ['Explicar a situação com transparência e buscar uma solução', 'Informar que atrasos são normais', 'Encerrar a conversa', 'Transferir a responsabilidade para outro setor'], correct: 0 },
      { q: 'O que significa atender com profissionalismo?', opts: ['Demonstrar competência técnica e boa postura', 'Apenas concluir o serviço', 'Atender rapidamente', 'Evitar contato com o cliente'], correct: 0 },
      { q: 'Estudo de caso: você chega ao local e o cliente está visivelmente insatisfeito por um problema anterior. Qual deve ser sua primeira atitude?', opts: ['Iniciar o serviço imediatamente', 'Ouvir o cliente e compreender sua insatisfação', 'Solicitar que ele fale apenas com a administração', 'Informar que o problema não é sua responsabilidade'], correct: 1 },
      { q: 'Após ouvir o cliente, qual deve ser o próximo passo?', opts: ['Ignorar os comentários', 'Demonstrar empatia e orientar sobre a solução', 'Discutir os fatos', 'Encerrar o atendimento'], correct: 1 },
      { q: 'Estudo de caso: durante uma manutenção, o cliente solicita informações sobre o andamento do serviço. Como agir?', opts: ['Não fornecer informações.', 'Informar apenas quando o serviço estiver concluído', 'Manter o cliente atualizado de forma objetiva', 'Solicitar que aguarde sem explicações'], correct: 2 },
      { q: 'Qual benefício existe em manter o cliente informado?', opts: ['Redução da confiança', 'Aumento da transparência e satisfação', 'Nenhum benefício', 'Apenas redução do tempo de atendimento'], correct: 1 },
      { q: 'A organização das ferramentas durante um atendimento externo demonstra:', opts: ['Apenas estética', 'Profissionalismo e controle', 'Nenhuma influência', 'Excesso de cuidado'], correct: 1 },
      { q: 'Em uma reclamação, qual informação deve ser registrada?', opts: ['Apenas o nome do cliente', 'Apenas o problema', 'Todos os dados relevantes para análise e solução', 'Nenhuma informação'], correct: 2 },
      { q: 'Qual é o principal objetivo da pesquisa de satisfação?', opts: ['Apenas cumprir procedimentos', 'Identificar oportunidades de melhoria e medir a percepção do cliente', 'Criar relatórios', 'Aumentar burocracia'], correct: 1 },
      { q: 'Um cliente não compreende um termo técnico utilizado na explicação. O que fazer?', opts: ['Repetir exatamente o mesmo termo', 'Utilizar linguagem mais simples e acessível', 'Encerrar a explicação', 'Solicitar que procure informações na internet'], correct: 1 },
      { q: 'O atendimento influencia diretamente:', opts: ['Apenas o setor técnico', 'Apenas o faturamento', 'A imagem da CicloWay perante os clientes', 'Apenas os indicadores internos'], correct: 2 },
      { q: 'Qual das alternativas melhor representa o padrão CicloWay de atendimento?', opts: ['Agilidade sem comunicação', 'Comunicação, profissionalismo, organização e foco no cliente', 'Apenas qualidade técnica', 'Apenas cumprimento de procedimentos'], correct: 1 },
      { q: 'Explique, com suas palavras, como você deve agir ao atender um cliente insatisfeito.', dissertativa: true },
    ],
  },
  {
    id: 'checklist', title: 'Checklist de Inspeção de Veículos',
    desc: 'Inspeção de entrada e saída, registro de não conformidades e evidências.',
    video: '', materials: [], pass: 70,
    questions: [
      { q: 'Qual é a principal finalidade do checklist de inspeção de entrada e saída do veículo?', opts: ['Registrar apenas as condições mecânicas do veículo.', 'Documentar as condições do veículo, garantindo rastreabilidade, segurança e identificação de não conformidades.', 'Controlar apenas a quilometragem.', 'Registrar somente os serviços executados.'], correct: 1 },
      { q: 'Durante a inspeção de entrada, foi identificado um arranhão na lateral do veículo. Qual deve ser o procedimento correto?', opts: ['Marcar "Conforme", pois o dano já existia.', 'Registrar a não conformidade, fotografar a avaria e descrevê-la no checklist.', 'Informar apenas verbalmente ao cliente.', 'Corrigir o dano antes de registrar.'], correct: 1 },
      { q: 'Em uma inspeção de saída, todos os itens mecânicos estão conformes, porém o veículo foi entregue sem o triângulo de segurança. Como o item deve ser registrado?', opts: ['Conforme.', 'Não Conforme.', 'N/A.', 'Não precisa ser registrado.'], correct: 1 },
      { q: 'Qual é o objetivo do registro fotográfico durante a inspeção?', opts: ['Apenas ilustrar o checklist.', 'Servir como evidência das condições do veículo e apoiar a rastreabilidade das informações.', 'Reduzir o tempo da inspeção.', 'Substituir o preenchimento do checklist.'], correct: 1 },
      { q: 'Quando a opção "N/A (Não Aplicável)" deve ser utilizada?', opts: ['Quando o inspetor não teve tempo de verificar o item.', 'Quando o item não existe ou não se aplica ao veículo inspecionado.', 'Quando o veículo apresenta defeito.', 'Quando o cliente não autoriza a inspeção.'], correct: 1 },
      { q: 'Durante a inspeção de saída, o farol alto não funciona, mas o restante do sistema de iluminação está conforme. Qual é a ação correta?', opts: ['Marcar todos os itens de iluminação como "Não Conforme".', 'Marcar apenas o farol alto como "Não Conforme", registrar a ocorrência e comunicar o responsável.', 'Marcar "Conforme", pois o farol baixo funciona.', 'Não registrar a ocorrência.'], correct: 1 },
      { q: 'Por que é importante preencher o checklist antes da entrega do veículo ao cliente?', opts: ['Para evitar a realização de novos serviços.', 'Para garantir que as condições do veículo foram verificadas e registradas antes da liberação.', 'Apenas para arquivamento interno.', 'Porque é obrigatório somente para veículos novos.'], correct: 1 },
      { q: 'Se um item não for inspecionado, qual é o procedimento correto?', opts: ['Marcar "Conforme".', 'Marcar "Não Conforme".', 'Realizar a inspeção antes de finalizar o checklist.', 'Deixar o campo em branco.'], correct: 2 },
      { q: 'Qual das situações abaixo representa uma não conformidade?', opts: ['Veículo limpo e sem avarias.', 'Farol alto queimado e retrovisor trincado.', 'Pneus calibrados e buzina funcionando.', 'Todos os itens conferidos e aprovados.'], correct: 1 },
      { q: 'Após concluir a inspeção, o responsável deve:', opts: ['Apenas arquivar o checklist.', 'Conferir o preenchimento, anexar as evidências necessárias e realizar a assinatura.', 'Apagar as fotografias para liberar espaço.', 'Solicitar que outro colaborador assine o documento.'], correct: 1 },
      { q: 'Estudo de caso: numa inspeção de saída — farol baixo ok, farol alto queimado, arranhão na porta do passageiro, pneus ok, buzina ok, triângulo ausente, registro fotográfico feito. Explique como o checklist deve ser preenchido e as providências antes da entrega.', dissertativa: true },
    ],
  },
  {
    id: 'satisfacao', title: 'Pesquisa de Satisfação',
    desc: 'Objetivo da pesquisa, o que cada pergunta avalia e o uso dos resultados (NPS).',
    video: '', materials: [], pass: 70,
    questions: [
      { q: 'Qual é o principal objetivo da Pesquisa de Satisfação da CicloWay?', opts: ['Aumentar os preços dos serviços', 'Medir a satisfação dos clientes e identificar oportunidades de melhoria', 'Controlar a produtividade dos mecânicos', 'Realizar campanhas de marketing'], correct: 1 },
      { q: 'A pesquisa de satisfação auxilia a CicloWay a:', opts: ['Ignorar reclamações dos clientes', 'Reduzir o número de atendimentos', 'Melhorar continuamente seus processos', 'Aumentar o tempo de execução dos serviços'], correct: 2 },
      { q: 'A Pergunta 1 ("Como você avalia sua experiência geral com a CicloWay?") tem como objetivo:', opts: ['Avaliar apenas o preço do serviço', 'Medir a percepção geral do cliente sobre o serviço prestado', 'Avaliar somente o atendimento da equipe', 'Avaliar apenas a oficina'], correct: 1 },
      { q: 'Quais aspectos são avaliados na Pergunta 2 ("Como você avalia o atendimento da nossa equipe?")?', opts: ['Cordialidade, agilidade e clareza das informações', 'Apenas prazo de execução', 'Apenas qualidade técnica', 'Apenas preço do serviço'], correct: 0 },
      { q: 'O principal objetivo da Pergunta 3 ("Como você avalia a qualidade do serviço realizado?") é:', opts: ['Avaliar a rapidez do atendimento ao cliente', 'Verificar se o serviço foi executado com qualidade e resolveu a necessidade do cliente', 'Medir a satisfação com os prazos informados', 'Identificar a opinião do cliente sobre os preços praticados'], correct: 1 },
      { q: 'A Pergunta 4 ("Como você avalia o prazo de execução do serviço?") busca avaliar principalmente:', opts: ['A percepção do cliente sobre a rapidez e o cumprimento dos prazos do atendimento', 'A quantidade de colaboradores envolvidos no serviço', 'A organização e aparência da oficina', 'O custo das peças utilizadas no reparo'], correct: 0 },
      { q: 'No NPS (Pergunta 5), clientes que atribuem notas 9 ou 10 são classificados como:', opts: ['Detratores', 'Neutros', 'Promotores', 'Insatisfeitos'], correct: 2 },
      { q: 'A Pergunta 6 ("O problema do seu veículo foi resolvido conforme sua expectativa?") avalia:', opts: ['Apenas o valor do serviço', 'A eficácia da solução apresentada ao cliente', 'O horário do atendimento', 'O tempo de deslocamento'], correct: 1 },
      { q: 'A clareza das informações fornecidas durante o atendimento é importante porque:', opts: ['Fortalece a confiança do cliente', 'Aumenta os custos do serviço', 'Reduz a qualidade do atendimento', 'Não influencia na satisfação'], correct: 0 },
      { q: 'Segundo o treinamento, cada resposta recebida na pesquisa representa:', opts: ['Uma obrigação burocrática', 'Um registro sem utilidade', 'Uma oportunidade para melhorar continuamente', 'Apenas um requisito da ISO'], correct: 2 },
      { q: 'Cite dois benefícios da Pesquisa de Satisfação para a CicloWay.', dissertativa: true },
      { q: 'Explique por que é importante acompanhar as notas baixas recebidas na pesquisa.', dissertativa: true },
    ],
  },
];

export function getTraining(id) { return TRAININGS.find((t) => t.id === id) || null; }

// Versão para o front: sem o gabarito (correct removido).
export function publicTrainings() {
  return TRAININGS.map((t) => ({
    id: t.id, title: t.title, desc: t.desc, video: t.video, materials: t.materials, pass: t.pass,
    questions: t.questions.map((q) => ({ q: q.q, opts: q.opts || null, dissertativa: !!q.dissertativa })),
  }));
}

// Corrige uma submissão. answers: array na ordem das questões (índice p/ objetiva, texto p/ dissertativa).
export function grade(id, answers) {
  const t = getTraining(id);
  if (!t) return null;
  let total = 0, acertos = 0;
  t.questions.forEach((q, i) => {
    if (q.dissertativa) return;
    total++;
    if (Number(answers?.[i]) === q.correct) acertos++;
  });
  const score = total ? Math.round((acertos / total) * 100) : 0;
  return { score, passed: score >= t.pass, acertos, total, pass: t.pass };
}

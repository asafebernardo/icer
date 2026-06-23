/**
 * Posts de exemplo (apenas frontend — não são gravados na base de dados).
 * IDs negativos para não colidir com registos reais.
 */
export const EXAMPLE_POST_IDS = new Set([
  -92001, -92002, -92003, -92004, -92005, -92006, -92007, -92008, -92009,
]);

/** @param {number | string} id */
export function isExamplePostId(id) {
  const n = Number(id);
  return Number.isFinite(n) && EXAMPLE_POST_IDS.has(n);
}

export const EXAMPLE_POSTS = [
  {
    id: -92001,
    titulo: "Culto dominical — série «Fé viva»",
    descricao: "Mensagem sobre Hebreus 11 e a confiança que move montanhas.",
    conteudo:
      "<p>Sem fé é impossível agradar a Deus. Neste domingo meditamos juntos sobre exemplos de fé que nos inspiram a perseverar.</p>",
    categoria: "culto_dominical",
    data_publicacao: "2026-06-22",
    autor: "Equipe ICER",
    visibility: "public",
  },
  {
    id: -92002,
    titulo: "Reunião de oração — testemunhos de cura",
    descricao: "Momento especial de intercessão e gratidão pelas vitórias do Senhor.",
    conteudo:
      "<p>Na quarta-feira nos reunimos para orar uns pelos outros. Compartilhamos testemunhos de cura e restauração.</p>",
    categoria: "oracao",
    data_publicacao: "2026-06-18",
    autor: "Equipe ICER",
    visibility: "public",
  },
  {
    id: -92003,
    titulo: "Batismo nas águas — junho 2026",
    descricao: "Celebração do batismo de três irmãos na fé.",
    conteudo:
      "<p>Com alegria testemunhamos o batismo de novos membros da família ICER. «Todo aquele que crer e for batizado será salvo.»</p>",
    categoria: "batismo",
    data_publicacao: "2026-06-15",
    autor: "Equipe ICER",
    visibility: "public",
  },
  {
    id: -92004,
    titulo: "Culto de ação de graças",
    descricao: "Noite dedicada a louvar a Deus pelas bênçãos recebidas ao longo do ano.",
    conteudo:
      "<p>Em tudo dai graças. Culto especial com louvor, testemunhos e comunhão.</p>",
    categoria: "acao_de_gracas",
    data_publicacao: "2026-06-11",
    autor: "Equipe ICER",
    visibility: "public",
  },
  {
    id: -92005,
    titulo: "Encontro de casais — junho",
    descricao: "Tema: «Construindo um lar segundo o coração de Deus».",
    conteudo:
      "<p>Casais da comunidade participaram de um encontro com dinâmicas, Palavra e momento de comunhão.</p>",
    categoria: "encontro_de_casais",
    data_publicacao: "2026-06-08",
    autor: "Ministério de casais",
    visibility: "public",
  },
  {
    id: -92006,
    titulo: "Celebração Dia das Mães",
    descricao: "Homenagem às mães da igreja com louvor, flores e palavra de encorajamento.",
    conteudo:
      "<p>Um momento especial para honrar as mães e agradecer por seu cuidado e dedicação.</p>",
    categoria: "dia_das_maes",
    data_publicacao: "2026-05-11",
    autor: "Equipe ICER",
    visibility: "public",
  },
  {
    id: -92007,
    titulo: "Celebração Dia dos Pais",
    descricao: "Culto em homenagem aos pais e avós da comunidade.",
    conteudo:
      "<p>Palavra sobre liderança no lar e oração pelos pais e suas famílias.</p>",
    categoria: "dia_das_pais",
    data_publicacao: "2025-08-10",
    autor: "Equipe ICER",
    visibility: "public",
  },
  {
    id: -92008,
    titulo: "Culto de Natal 2025",
    descricao: "Celebração natalina com coral, drama e mensagem sobre o nascimento de Cristo.",
    conteudo:
      "<p>«Hoje, na cidade de Davi, nasceu o Salvador, que é Cristo, o Senhor.»</p>",
    categoria: "natal",
    data_publicacao: "2025-12-25",
    autor: "Equipe ICER",
    visibility: "public",
  },
  {
    id: -92009,
    titulo: "Culto de Páscoa — ressurreição",
    descricao: "Celebração da ressurreição de Jesus com louvor e Santa Ceia.",
    conteudo:
      "<p>Ele não está aqui, ressuscitou, como havia dito. Aleluia!</p>",
    categoria: "pascoa",
    data_publicacao: "2026-04-20",
    autor: "Equipe ICER",
    visibility: "public",
  },
];

/** @param {number | string} id */
export function getExamplePostById(id) {
  const n = Number(id);
  return EXAMPLE_POSTS.find((p) => p.id === n) ?? null;
}

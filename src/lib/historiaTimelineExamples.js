/**
 * Marcos de exemplo para a página História.
 * @typedef {{ src: string; alt: string; caption?: string }} HistoriaTimelineImage
 * @typedef {{
 *   year: string;
 *   title: string;
 *   description: string;
 *   body?: string;
 *   highlights?: string[];
 *   images?: HistoriaTimelineImage[];
 * }} HistoriaTimelineItem
 */

/** @type {HistoriaTimelineItem[]} */
export const HISTORIA_TIMELINE_EXAMPLE = [
  {
    year: "1985",
    title: "Primeiros encontros",
    description:
      "Pequeno grupo de irmãos reúne-se em Chapecó para cultos e estudo bíblico em casa.",
    body:
      "Os primeiros cultos aconteciam em salas de estar, com hinos ao piano e leitura bíblica partilhada. A féfulness de poucas famílias lançou as bases da comunidade que viria a crescer ao longo das décadas seguintes.",
    highlights: [
      "Reuniões semanais em casas de irmãos",
      "Estudo bíblico e orações em pequenos grupos",
      "Primeiros contactos com famílias da região oeste",
    ],
    images: [
      {
        src: "/logo-default.webp",
        alt: "Símbolo da comunidade nos primeiros anos",
        caption: "Identidade visual que acompanhou os primeiros encontros.",
      },
      {
        src: "/site-background-mountains.webp",
        alt: "Paisagem da região de Chapecó",
        caption: "A região onde a igreja nasceu e cresceu.",
      },
    ],
  },
  {
    year: "1998",
    title: "Sede provisória",
    description:
      "A comunidade passa a reunir-se num salão alugado, com cultos dominicais e reunião de oração.",
    body:
      "Com o aumento de participantes, tornou-se necessário um espaço maior. O salão alugado permitiu cultos dominicais regulares, escola bíblica infantil e uma reunião de oração à quarta-feira.",
    highlights: [
      "Cultos dominicais matutinos e vespertinos",
      "Reunião de oração semanal",
      "Início da organização por ministérios",
    ],
    images: [
      {
        src: "/recursos-pattern-bg.webp",
        alt: "Textura decorativa do salão",
        caption: "Ambiente acolhedor do salão provisório.",
      },
    ],
  },
  {
    year: "2008",
    title: "Templo próprio",
    description:
      "Inauguração do templo na região central, ampliando espaço para escola bíblica e ministérios.",
    body:
      "A inauguração marcou uma nova fase: mais assentos, sala para crianças, cozinha para confraternizações e estacionamento para visitantes. Foi um marco de gratidão e de compromisso com a pregação do evangelho na cidade.",
    highlights: [
      "Capacidade ampliada para cultos e eventos",
      "Salas dedicadas à escola bíblica",
      "Primeiro batismo colectivo no novo templo",
    ],
    images: [
      {
        src: "/site-background-mountains.webp",
        alt: "Vista exterior do templo",
        caption: "Fachada principal após a inauguração.",
      },
      {
        src: "/images/post-categories/acao-de-gracas.webp",
        alt: "Culto de ação de graças",
        caption: "Celebração de gratidão pela nova sede.",
      },
      {
        src: "/agenda-pattern-bg.webp",
        alt: "Interior do auditório",
        caption: "Auditório preparado para cultos e conferências.",
      },
    ],
  },
  {
    year: "2016",
    title: "Expansão dos ministérios",
    description:
      "Consolidação de grupos de jovens, mulheres e homens; primeiros encontros regionais.",
    body:
      "Os ministérios temáticos ganharam ritmo próprio: encontros de jovens, conferências para casais, retiros e ações sociais. A igreja passou a ser referência em eventos abertos à comunidade de Chapecó.",
    highlights: [
      "Grupos de jovens, mulheres e homens activos",
      "Primeiros encontros regionais inter-igrejas",
      "Projectos de acolhimento e serviço social",
    ],
    images: [
      {
        src: "/eventos-pattern-bg.webp",
        alt: "Encontro de jovens",
        caption: "Momento de louvor num encontro de jovens.",
      },
      {
        src: "/posts-pattern-bg.webp",
        alt: "Conferência regional",
        caption: "Participantes de várias cidades na região.",
      },
    ],
  },
  {
    year: "2024",
    title: "Comunidade hoje",
    description:
      "ICER Chapecó continua a anunciar o evangelho, acolher famílias e servir a cidade.",
    body:
      "Hoje a ICER reúne gerações diferentes numa mesma família espiritual. Cultos presenciais e conteúdo digital complementam-se; a prioridade continua a ser Cristo, a Palavra e o cuidado com cada pessoa.",
    highlights: [
      "Cultos dominicais e reuniões durante a semana",
      "Site e redes para partilhar eventos e recursos",
      "Portas abertas a quem procura uma igreja bíblica",
    ],
    images: [
      {
        src: "/logo-default.webp",
        alt: "Logo actual da ICER Chapecó",
        caption: "Identidade visual actual da igreja.",
      },
      {
        src: "/admin-pattern-bg.webp",
        alt: "Equipa e voluntários",
        caption: "Serviço conjunto de irmãos em diferentes áreas.",
      },
    ],
  },
];

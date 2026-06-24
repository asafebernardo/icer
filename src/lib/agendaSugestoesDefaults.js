/**
 * Valores iniciais das listas de sugestão (eventos: título, horário, preletor, presbítero).
 * Persistidas no servidor em `public_workspace.agenda_sugestoes` quando há sessão MongoDB.
 */
export const DEFAULT_AGENDA_SUGESTOES = {
  /** Por texto exacto do título sugerido → preset de barra (`auto` | `blue` | …). */
  titulo_cor_barra: {},
  /** Por texto exacto do título → lista de URLs de imagem de fundo do cartão (rotação automática). */
  titulo_imagens_fundo: {},
  titulo: [
    "Ceia + EBD",
    "Estudo bíblico",
    "Reunião feminina",
    "Reunião masculina",
    "Reunião de jovens",
    "Reunião de oração",
    "Cronológico",
    "Aconselhamento",
    "Assembléia",
  ],
  preletor: ["Asafe", "Joneri", "Juninho"],
  /** Presbítero no formulário (`pastor` na API); mesma lista em agendamento em massa. */
  pastor: ["Joneri", "Sandro"],
  /** Locais sugeridos (evento + agendamento em massa). */
  local: ["Sede local", "Outros"],
  /** Horários sugeridos (formato HH:mm — evento, rotinas / agendamento em massa). */
  horario: ["09:00", "10:00", "18:30", "19:00", "19:30", "19:45", "20:00"],
  /** nome do preletor → URL da foto (definido no admin). */
  preletor_avatars: {},
  /** nome do presbítero (`pastor` na API) → URL da foto. */
  pastor_avatars: {},
};

/** Listas de texto (UI admin + forms). `preletor_avatars` / `pastor_avatars` são mapas à parte. */
export const AGENDA_SUGESTOES_KEYS = [
  "titulo",
  "preletor",
  "pastor",
  "local",
  "horario",
];

export const AGENDA_SUGESTOES_FIELD_META = {
  titulo: {
    title: "Títulos sugeridos",
    tabLabel: "Títulos",
    description: "Sugestões nos formulários; cor da barra e fundo do cartão por título.",
  },
  preletor: {
    title: "Preletores",
    tabLabel: "Preletores",
    description: "Nomes sugeridos; foto opcional por nome.",
  },
  pastor: {
    title: "Presbíteros",
    tabLabel: "Presbíteros",
    description: "Nomes sugeridos; foto opcional por nome.",
  },
  local: {
    title: "Locais do evento",
    tabLabel: "Locais",
    description: "Sugestões de local.",
  },
  horario: {
    title: "Horários",
    tabLabel: "Horários",
    description: "HH:mm, um por linha — únicas opções nos formulários.",
  },
};

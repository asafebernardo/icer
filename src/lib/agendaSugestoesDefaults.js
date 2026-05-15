/**
 * Valores iniciais das listas de sugestão (eventos: título, horário, preletor, presbítero, categoria).
 * Persistidas no servidor em `public_workspace.agenda_sugestoes` quando há sessão MongoDB.
 */
import { EVENTO_CATEGORIAS } from "@/lib/eventoFormOptions";

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
  categoria: EVENTO_CATEGORIAS.map((c) => c.value),
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
  "categoria",
  "local",
  "horario",
];

export const AGENDA_SUGESTOES_FIELD_META = {
  titulo: {
    title: "Títulos sugeridos",
    description:
      "Aparecem ao criar ou editar eventos e no agendamento em massa. Por cada título pode definir a cor da barra do cartão e imagens de fundo do cartão (uma ou várias). Quando o evento não tem imagem própria, essas imagens aparecem como fundo nos cartões do site.",
  },
  preletor: {
    title: "Preletores",
    description:
      "Nomes sugeridos nos formulários. Por cada nome pode carregar uma foto de perfil (aparece nos cartões do site quando o evento usa esse preletor).",
  },
  pastor: {
    title: "Presbíteros",
    description:
      "Mesma lista para o campo Presbítero nos formulários de evento e para o padrão por data em massa. Por cada nome pode carregar uma foto de perfil.",
  },
  categoria: {
    title: "Categorias (identificadores)",
    description:
      "Valores internos (slug) usados pelo sistema. Se alterar ou remover, confirme que correspondem às categorias dos eventos já gravados.",
  },
  local: {
    title: "Locais do evento",
    description: "Opções sugeridas ao definir o local de cada evento.",
  },
  horario: {
    title: "Horários",
    description:
      "Valores em formato 24 h (HH:mm), um por linha. São as únicas opções nos formulários de evento e de novo agendamento (não é possível escrever outro horário — altere a lista aqui).",
  },
};

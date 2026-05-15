/** @typedef {{ v: number; short: string; label: string }} WeekdayOption */

/** Domingo = 0 … Sábado = 6 (Date.getDay). */
export const AGENDA_SIMPLE_WEEKDAY_OPTIONS = [
  { v: 0, short: "Dom", label: "Domingo" },
  { v: 1, short: "Seg", label: "Segunda" },
  { v: 2, short: "Ter", label: "Terça" },
  { v: 3, short: "Qua", label: "Quarta" },
  { v: 4, short: "Qui", label: "Quinta" },
  { v: 5, short: "Sex", label: "Sexta" },
  { v: 6, short: "Sáb", label: "Sábado" },
];

export const DEFAULT_AGENDA_SIMPLE_GRID = {
  dia_column_label: "DIA",
  cultos_group_label: "CULTOS",
  manha_label: "MANHÃ",
  noite_label: "NOITE",
  reuniao_oracao_line1: "REUNIÃO",
  reuniao_oracao_line2: "ORAÇÃO",
  outras_line1: "OUTRAS",
  outras_line2: "REUNIÕES",
  /** Dias (0–6) em que eventos «culto» podem aparecer nas colunas Manhã/Noite. Vazio = todos. */
  culto_weekdays: [],
  /** Dias em que eventos «estudo» podem aparecer na coluna Oração. Vazio = todos. */
  oracao_weekdays: [],
};

/**
 * @param {Record<string, unknown>} defaults
 * @param {unknown} remote
 */
export function mergeAgendaSimpleGrid(defaults, remote) {
  const base =
    defaults && typeof defaults === "object"
      ? { ...defaults }
      : { ...DEFAULT_AGENDA_SIMPLE_GRID };
  const ext = remote && typeof remote === "object" ? remote : {};
  const out = { ...base, ...ext };
  const normWeek = (arr) => {
    if (!Array.isArray(arr)) return [];
    const s = new Set();
    for (const x of arr) {
      const n = Number(x);
      if (Number.isInteger(n) && n >= 0 && n <= 6) s.add(n);
    }
    return [...s].sort((a, b) => a - b);
  };
  out.culto_weekdays = normWeek(out.culto_weekdays);
  out.oracao_weekdays = normWeek(out.oracao_weekdays);
  for (const k of Object.keys(DEFAULT_AGENDA_SIMPLE_GRID)) {
    if (typeof DEFAULT_AGENDA_SIMPLE_GRID[k] === "string" && typeof out[k] !== "string") {
      out[k] = DEFAULT_AGENDA_SIMPLE_GRID[k];
    }
  }
  return out;
}

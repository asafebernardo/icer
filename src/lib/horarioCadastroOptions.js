import { DEFAULT_AGENDA_SUGESTOES } from "@/lib/agendaSugestoesDefaults";

/** Valor do Select para «sem horário de fim» (não colidir com HH:mm). */
export const HORARIO_FIM_VAZIO = "__sem_fim__";

/**
 * Opções do seletor de horário: lista do cadastro (ou padrão de fábrica) + valores
 * extra (ex.: evento antigo fora da lista) para não perder dados ao editar.
 * @param {unknown} sugestoesHorarioList
 * @param {string[]} extraValues
 * @returns {string[]}
 */
export function horarioSelectOptions(sugestoesHorarioList, ...extraValues) {
  const base =
    Array.isArray(sugestoesHorarioList) && sugestoesHorarioList.length > 0
      ? sugestoesHorarioList
      : DEFAULT_AGENDA_SUGESTOES.horario || [];
  const set = new Set(
    base.map((x) => String(x ?? "").trim()).filter(Boolean),
  );
  for (const v of extraValues) {
    const t = String(v ?? "").trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) =>
    a.localeCompare(b, "pt", { sensitivity: "base", numeric: true }),
  );
}

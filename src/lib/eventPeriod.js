/**
 * Períodos do dia (manhã / tarde / noite) para agenda semanal e programação de eventos.
 */

/** Primeiro horário do campo (ex.: "10:00 – 12:00" → início). Devolve hora decimal ou null. */
export function parseHorarioToHour(horario) {
  if (!horario || typeof horario !== "string") return null;
  const first = horario.split(/[–—\-]/)[0].trim();
  const withMin = first.match(/^(\d{1,2})\s*[:h]\s*(\d{2})/i);
  if (withMin) {
    const h = parseInt(withMin[1], 10);
    const m = parseInt(withMin[2], 10);
    if (h > 23 || m > 59) return null;
    return h + m / 60;
  }
  const hourOnly = first.match(/^(\d{1,2})\s*h\b/i);
  if (hourOnly) {
    const h = parseInt(hourOnly[1], 10);
    if (h > 23) return null;
    return h;
  }
  return null;
}

/** A partir de hora decimal (ex. 14.5). */
export function periodKeyFromDecimalHour(hour) {
  if (hour === null) return "sem";
  if (hour < 5 || hour >= 18) return "noite";
  if (hour < 12) return "manha";
  return "tarde";
}

/** "09:30" ou texto de horário de evento → chave de período. */
export function periodKeyFromTimeString(horario) {
  const h = parseHorarioToHour(horario);
  return periodKeyFromDecimalHour(h);
}

/** Agrupa itens de programação (hora + título) por período do dia. */
export function groupProgramItensByPeriod(itens) {
  const list = Array.isArray(itens) ? itens : [];
  const sorted = [...list].sort((a, b) =>
    String(a.hora || "").localeCompare(String(b.hora || "")),
  );
  const buckets = { manha: [], tarde: [], noite: [], sem: [] };
  for (const it of sorted) {
    buckets[periodKeyFromTimeString(it.hora)].push(it);
  }
  return buckets;
}

export const PROGRAM_PERIOD_ORDER = [
  {
    key: "manha",
    label: "Manhã",
    headingClass:
      "text-amber-800 dark:text-amber-200 border-b border-amber-300/50 dark:border-amber-700/40",
  },
  {
    key: "tarde",
    label: "Tarde",
    headingClass:
      "text-sky-800 dark:text-sky-200 border-b border-sky-300/50 dark:border-sky-700/40",
  },
  {
    key: "noite",
    label: "Noite",
    headingClass:
      "text-indigo-800 dark:text-indigo-200 border-b border-indigo-300/50 dark:border-indigo-700/40",
  },
  {
    key: "sem",
    label: "Sem horário definido",
    headingClass:
      "text-violet-800 dark:text-violet-200 border-b border-violet-300/50 dark:border-violet-700/40",
  },
];

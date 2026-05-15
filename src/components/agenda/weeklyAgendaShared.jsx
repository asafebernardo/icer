import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Sun, CloudSun, MoonStar, Clock } from "lucide-react";
import { eventCardBarClass } from "@/lib/eventCardColors";
import {
  parseHorarioToHour,
  periodKeyFromDecimalHour,
} from "@/lib/eventPeriod";
import { cn } from "@/lib/utils";
import SafeImg from "@/components/shared/SafeImg";
import { CATEGORY_BAR_CLASS } from "@/lib/categoryAppearance";

const categoriaColorsBg = CATEGORY_BAR_CLASS;

export const PERIOD_KEYS = ["manha", "tarde", "noite", "sem"];

/** Períodos — tons derivados de `index.css` (--period-*). */
export const PERIOD_STYLE = {
  manha: {
    label: "Manhã",
    Icon: Sun,
    sticky: "bg-[hsl(var(--period-morning-bg))]",
    iconWrap:
      "bg-[hsl(var(--period-morning-border)/0.35)] text-foreground dark:bg-[hsl(var(--period-morning-border)/0.42)]",
    labelText: "text-foreground",
    rowBgEmpty: "bg-[hsl(var(--period-morning-bg))]",
    rowBgWithEvents: "bg-[hsl(var(--period-morning-bg))]",
    gridLine:
      "border-b border-r border-[hsl(var(--period-morning-border)/0.8)] dark:border-[hsl(var(--period-morning-border)/0.5)]",
    cardBorder:
      "border-[hsl(var(--period-morning-border)/0.65)] hover:border-[hsl(var(--period-morning-border))] dark:border-[hsl(var(--period-morning-border)/0.45)] dark:hover:border-[hsl(var(--period-morning-border)/0.65)]",
    emptyDash: "text-foreground/25",
  },
  tarde: {
    label: "Tarde",
    Icon: CloudSun,
    sticky: "bg-[hsl(var(--period-afternoon-bg))]",
    iconWrap:
      "bg-[hsl(var(--period-afternoon-border)/0.35)] text-foreground dark:bg-[hsl(var(--period-afternoon-border)/0.42)]",
    labelText: "text-foreground",
    rowBgEmpty: "bg-[hsl(var(--period-afternoon-bg))]",
    rowBgWithEvents: "bg-[hsl(var(--period-afternoon-bg))]",
    gridLine:
      "border-b border-r border-[hsl(var(--period-afternoon-border)/0.8)] dark:border-[hsl(var(--period-afternoon-border)/0.5)]",
    cardBorder:
      "border-[hsl(var(--period-afternoon-border)/0.65)] hover:border-[hsl(var(--period-afternoon-border))] dark:border-[hsl(var(--period-afternoon-border)/0.45)] dark:hover:border-[hsl(var(--period-afternoon-border)/0.65)]",
    emptyDash: "text-foreground/25",
  },
  noite: {
    label: "Noite",
    Icon: MoonStar,
    sticky: "bg-[hsl(var(--period-night-bg))]",
    iconWrap:
      "bg-[hsl(var(--period-night-border)/0.35)] text-foreground dark:bg-[hsl(var(--period-night-border)/0.42)]",
    labelText: "text-foreground",
    rowBgEmpty: "bg-[hsl(var(--period-night-bg))]",
    rowBgWithEvents: "bg-[hsl(var(--period-night-bg))]",
    gridLine:
      "border-b border-r border-[hsl(var(--period-night-border)/0.8)] dark:border-[hsl(var(--period-night-border)/0.5)]",
    cardBorder:
      "border-[hsl(var(--period-night-border)/0.65)] hover:border-[hsl(var(--period-night-border))] dark:border-[hsl(var(--period-night-border)/0.45)] dark:hover:border-[hsl(var(--period-night-border)/0.65)]",
    emptyDash: "text-foreground/25",
  },
  sem: {
    label: "Sem horário",
    Icon: Clock,
    sticky: "bg-[hsl(var(--period-open-bg))]",
    iconWrap:
      "bg-[hsl(var(--period-open-border)/0.35)] text-foreground dark:bg-[hsl(var(--period-open-border)/0.42)]",
    labelText: "text-foreground",
    rowBgEmpty: "bg-[hsl(var(--period-open-bg))]",
    rowBgWithEvents: "bg-[hsl(var(--period-open-bg))]",
    gridLine:
      "border-b border-r border-[hsl(var(--period-open-border)/0.8)] dark:border-[hsl(var(--period-open-border)/0.5)]",
    cardBorder:
      "border-[hsl(var(--period-open-border)/0.65)] hover:border-[hsl(var(--period-open-border))] dark:border-[hsl(var(--period-open-border)/0.45)] dark:hover:border-[hsl(var(--period-open-border)/0.65)]",
    emptyDash: "text-foreground/25",
  },
};

export function groupEventosByPeriod(eventos) {
  const buckets = { manha: [], tarde: [], noite: [], sem: [] };
  for (const ev of eventos) {
    const h = parseHorarioToHour(ev.horario);
    buckets[periodKeyFromDecimalHour(h)].push(ev);
  }
  return buckets;
}

export function getSortedEventosForDay(day, eventos) {
  return eventos
    .filter((e) => e.data && isSameDay(parseISO(e.data), day))
    .sort(
      (a, b) =>
        (a.horario || "").localeCompare(b.horario || "") ||
        (a.titulo || "").localeCompare(b.titulo || ""),
    );
}

export function getPeriodRowsForWeek(weekDays, eventos) {
  return PERIOD_KEYS.filter((key) => {
    if (key !== "sem") return true;
    return weekDays.some((day) => {
      const by = groupEventosByPeriod(getSortedEventosForDay(day, eventos));
      return by.sem.length > 0;
    });
  });
}

export function WeeklyAgendaEventCard({
  evento,
  idx,
  onSelect,
  periodKey,
  showPreletorCards,
  tituloCorBarraMap,
}) {
  const barColor = eventCardBarClass(evento, categoriaColorsBg, tituloCorBarraMap);
  const cardBorder = PERIOD_STYLE[periodKey]?.cardBorder ?? "";

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      onClick={() => onSelect?.(evento)}
      className={cn(
        "w-full text-left bg-card border rounded-xl overflow-hidden shadow-none transition-colors",
        cardBorder,
      )}
    >
      <div className={`h-1 w-full ${barColor}`} />
      <div className="px-2 py-2">
        {!showPreletorCards && evento.horario && (
          <p className="text-[9px] font-semibold text-foreground/72 tabular-nums mb-0.5">
            {evento.horario.split(/[–—\-]/)[0].trim()}
          </p>
        )}
        <p className="text-xs font-bold text-foreground leading-snug line-clamp-2">
          {evento.titulo}
        </p>
        {showPreletorCards ? (
          <div className="mt-1 flex items-center gap-1.5 min-w-0">
            {evento.preletor_avatar_url ? (
              <SafeImg
                src={evento.preletor_avatar_url}
                alt=""
                className="h-4 w-4 rounded-full object-cover border border-border/70 shrink-0"
                loading="lazy"
              />
            ) : null}
            <p className="text-[10px] font-medium text-muted-foreground leading-snug line-clamp-1 min-w-0">
              {String(evento.preletor || "").trim() || "—"}
            </p>
          </div>
        ) : null}
      </div>
    </motion.button>
  );
}

/** Rótulo curto do dia para cabeçalhos mobile (ex.: «qui., 15»). */
export function formatDayHeadingMobile(day) {
  return format(day, "EEE, d MMM", { locale: ptBR });
}

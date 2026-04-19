import { Fragment } from "react";
import { format, isSameDay, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Sun, CloudSun, MoonStar, Clock } from "lucide-react";
import { eventCardBarClass } from "@/lib/eventCardColors";
import {
  parseHorarioToHour,
  periodKeyFromDecimalHour,
} from "@/lib/eventPeriod";
import { cn } from "@/lib/utils";

const categoriaColorsBg = {
  culto: "bg-blue-600",
  estudo: "bg-green-600",
  jovens: "bg-purple-600",
  mulheres: "bg-pink-500",
  homens: "bg-orange-500",
  criancas: "bg-yellow-500",
  especial: "bg-red-600",
  conferencia: "bg-indigo-600",
};

const PERIOD_KEYS = ["manha", "tarde", "noite", "sem"];

/** Cores e ícones por período (coluna esquerda + células + contornos na cor do período). */
const PERIOD_STYLE = {
  manha: {
    label: "Manhã",
    Icon: Sun,
    sticky: "bg-amber-50 dark:bg-amber-950/45",
    iconWrap: "bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100",
    labelText: "text-amber-950 dark:text-amber-50",
    rowBgEmpty: "bg-amber-50 dark:bg-amber-950/45",
    rowBgWithEvents: "bg-amber-50 dark:bg-amber-950/45",
    /** Contornos da grelha (horizontal + vertical) na cor do período */
    gridLine:
      "border-b border-r border-amber-200/85 dark:border-amber-800/55",
    cardBorder:
      "border-amber-400/55 dark:border-amber-600/50 hover:border-amber-500/70 dark:hover:border-amber-500/60",
    emptyDash: "text-amber-900/30 dark:text-amber-100/25",
  },
  tarde: {
    label: "Tarde",
    Icon: CloudSun,
    sticky: "bg-sky-50 dark:bg-sky-950/40",
    iconWrap: "bg-sky-200/80 dark:bg-sky-800/55 text-sky-900 dark:text-sky-100",
    labelText: "text-sky-950 dark:text-sky-50",
    rowBgEmpty: "bg-sky-50 dark:bg-sky-950/40",
    rowBgWithEvents: "bg-sky-50 dark:bg-sky-950/40",
    gridLine:
      "border-b border-r border-sky-200/85 dark:border-sky-800/55",
    cardBorder:
      "border-sky-400/55 dark:border-sky-600/50 hover:border-sky-500/70 dark:hover:border-sky-500/60",
    emptyDash: "text-sky-900/30 dark:text-sky-100/25",
  },
  noite: {
    label: "Noite",
    Icon: MoonStar,
    sticky: "bg-indigo-50 dark:bg-indigo-950/45",
    iconWrap:
      "bg-indigo-200/80 dark:bg-indigo-800/55 text-indigo-900 dark:text-indigo-100",
    labelText: "text-indigo-950 dark:text-indigo-50",
    rowBgEmpty: "bg-indigo-50 dark:bg-indigo-950/45",
    rowBgWithEvents: "bg-indigo-50 dark:bg-indigo-950/45",
    gridLine:
      "border-b border-r border-indigo-200/85 dark:border-indigo-800/55",
    cardBorder:
      "border-indigo-400/55 dark:border-indigo-600/50 hover:border-indigo-500/70 dark:hover:border-indigo-500/60",
    emptyDash: "text-indigo-900/30 dark:text-indigo-100/25",
  },
  sem: {
    label: "Sem horário",
    Icon: Clock,
    sticky: "bg-violet-50 dark:bg-violet-950/45",
    iconWrap:
      "bg-violet-200/80 dark:bg-violet-800/55 text-violet-900 dark:text-violet-100",
    labelText: "text-violet-950 dark:text-violet-50",
    rowBgEmpty: "bg-violet-50 dark:bg-violet-950/45",
    rowBgWithEvents: "bg-violet-50 dark:bg-violet-950/45",
    gridLine:
      "border-b border-r border-violet-200/85 dark:border-violet-800/55",
    cardBorder:
      "border-violet-400/55 dark:border-violet-600/50 hover:border-violet-500/70 dark:hover:border-violet-500/60",
    emptyDash: "text-violet-900/30 dark:text-violet-100/25",
  },
};

function groupEventosByPeriod(eventos) {
  const buckets = { manha: [], tarde: [], noite: [], sem: [] };
  for (const ev of eventos) {
    const h = parseHorarioToHour(ev.horario);
    buckets[periodKeyFromDecimalHour(h)].push(ev);
  }
  return buckets;
}

function EventoCard({ evento, idx, onSelect, periodKey }) {
  const barColor = eventCardBarClass(evento, categoriaColorsBg);
  const cardBorder = PERIOD_STYLE[periodKey]?.cardBorder ?? "";

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      onClick={() => onSelect?.(evento)}
      className={cn(
        "w-full text-left bg-white dark:bg-card border rounded-xl overflow-hidden shadow-none transition-colors",
        cardBorder,
      )}
    >
      <div className={`h-1 w-full ${barColor}`} />
      <div className="px-2 py-2">
        {evento.horario && (
          <p className="text-[9px] font-semibold text-foreground/65 tabular-nums mb-0.5">
            {evento.horario.split(/[–—\-]/)[0].trim()}
          </p>
        )}
        <p className="text-xs font-bold text-foreground leading-snug line-clamp-3">
          {evento.titulo}
        </p>
      </div>
    </motion.button>
  );
}

const stickyBase = "sticky left-0 z-10 shadow-none";

export default function WeeklyCalendar({ weekDays, eventos, onEventClick }) {
  const getEventosForDay = (day) =>
    eventos
      .filter((e) => e.data && isSameDay(parseISO(e.data), day))
      .sort(
        (a, b) =>
          (a.horario || "").localeCompare(b.horario || "") ||
          (a.titulo || "").localeCompare(b.titulo || ""),
      );

  const periodRows = PERIOD_KEYS.filter((key) => {
    if (key !== "sem") return true;
    return weekDays.some((day) => {
      const by = groupEventosByPeriod(getEventosForDay(day));
      return by.sem.length > 0;
    });
  });

  return (
    <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-background overflow-hidden shadow-none">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[780px] w-full"
          style={{
            gridTemplateColumns:
              "minmax(6.75rem, auto) repeat(7, minmax(0, 1fr))",
          }}
        >
          {/* Canto + cabeçalho dos dias (Dom … Sáb) */}
          <div
            className={`${stickyBase} bg-background border-b border-r border-black/[0.07] dark:border-white/[0.08] py-3 px-2`}
            aria-hidden
          />
          {weekDays.map((day, dayIdx) => {
            const today = isToday(day);
            return (
              <div
                key={`h-${day.toString()}`}
                className={cn(
                  "py-3 text-center border-b border-black/[0.07] dark:border-white/[0.08]",
                  dayIdx < 6 &&
                    "border-r border-black/[0.07] dark:border-white/[0.08]",
                  dayIdx === 6 && "border-r-0",
                  today ? "bg-accent/10" : "bg-background",
                )}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wider ${today ? "text-accent" : "text-foreground/75"}`}
                >
                  {format(day, "EEE", { locale: ptBR })}
                </p>
                {today && (
                  <div className="mt-1 mx-auto w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </div>
            );
          })}

          {periodRows.map((key) => {
            const meta = PERIOD_STYLE[key];
            const {
              Icon,
              label,
              sticky,
              iconWrap,
              labelText,
              rowBgEmpty,
              rowBgWithEvents,
              gridLine,
              emptyDash,
            } = meta;
            return (
            <Fragment key={key}>
              <div
                className={cn(
                  stickyBase,
                  sticky,
                  gridLine,
                  "py-2.5 px-2 flex flex-col gap-1 items-center justify-center text-center min-h-[4.75rem]",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    iconWrap,
                  )}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide leading-tight",
                    labelText,
                  )}
                >
                  {label}
                </span>
              </div>
              {weekDays.map((day, dayIdx) => {
                const today = isToday(day);
                const evs = getEventosForDay(day);
                const list = groupEventosByPeriod(evs)[key];
                const isEmpty = list.length === 0;
                return (
                  <div
                    key={`${key}-${day.toString()}`}
                    className={cn(
                      "p-1.5 min-h-[88px] align-top",
                      gridLine,
                      dayIdx === 6 && "border-r-0",
                      isEmpty ? rowBgEmpty : rowBgWithEvents,
                      today &&
                        "ring-1 ring-inset ring-accent/45 dark:ring-accent/35",
                    )}
                  >
                    {isEmpty ? (
                      <div className="h-full min-h-[72px] flex items-center justify-center">
                        <span
                          className={cn("text-[10px] font-medium", emptyDash)}
                        >
                          —
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {list.map((ev, idx) => (
                          <EventoCard
                            key={ev.id}
                            evento={ev}
                            idx={idx}
                            periodKey={key}
                            onSelect={onEventClick}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  PERIOD_STYLE,
  WeeklyAgendaEventCard,
  formatDayHeadingMobile,
  getPeriodRowsForWeek,
  getSortedEventosForDay,
  groupEventosByPeriod,
} from "@/components/agenda/weeklyAgendaShared";

/**
 * Vista semanal só para telemóvel: lista vertical por dia (sem grelha 780px).
 */
export default function WeeklyAgendaMobile({
  weekDays,
  eventos,
  onEventClick,
  showPreletorCards = false,
  tituloCorBarraMap = {},
}) {
  const periodRows = getPeriodRowsForWeek(weekDays, eventos);

  return (
    <div className="rounded-2xl border border-border/70 bg-background overflow-hidden shadow-none">
      <div className="divide-y divide-border/70">
        {weekDays.map((day) => {
          const today = isToday(day);
          const evs = getSortedEventosForDay(day, eventos);
          const byPeriod = groupEventosByPeriod(evs);

          return (
            <section
              key={day.toISOString()}
              className={cn("px-3 py-3", today && "bg-accent/[0.06]")}
              aria-label={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
            >
              <div className="flex items-baseline justify-between gap-2 min-w-0">
                <h3
                  className={cn(
                    "text-sm font-bold capitalize min-w-0 truncate",
                    today ? "text-accent" : "text-foreground",
                  )}
                >
                  {formatDayHeadingMobile(day)}
                </h3>
                {today ? (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    Hoje
                  </span>
                ) : null}
              </div>

              {evs.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Sem eventos.</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {periodRows.map((periodKey) => {
                    const list = byPeriod[periodKey] || [];
                    if (list.length === 0) return null;
                    const meta = PERIOD_STYLE[periodKey];
                    const { Icon, label, iconWrap, labelText } = meta;

                    return (
                      <div key={periodKey}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                              iconWrap,
                            )}
                            aria-hidden
                          >
                            <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wide",
                              labelText,
                            )}
                          >
                            {label}
                          </span>
                        </div>
                        <div className="space-y-1.5 pl-0.5">
                          {list.map((ev, idx) => (
                            <WeeklyAgendaEventCard
                              key={ev.id}
                              evento={ev}
                              idx={idx}
                              periodKey={periodKey}
                              onSelect={onEventClick}
                              showPreletorCards={showPreletorCards}
                              tituloCorBarraMap={tituloCorBarraMap}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

import { Fragment } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  PERIOD_STYLE,
  WeeklyAgendaEventCard,
  getPeriodRowsForWeek,
  getSortedEventosForDay,
  groupEventosByPeriod,
} from "@/components/agenda/weeklyAgendaShared";

const stickyBase = "sticky left-0 z-10 shadow-none";

export default function WeeklyCalendar({
  weekDays,
  eventos,
  onEventClick,
  showPreletorCards = false,
  tituloCorBarraMap = {},
}) {
  const getEventosForDay = (day) => getSortedEventosForDay(day, eventos);

  const periodRows = getPeriodRowsForWeek(weekDays, eventos);

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
                  className={`text-xs font-bold uppercase tracking-wider ${today ? "text-accent" : "text-foreground/82"}`}
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
                      rowBgEmpty,
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
                          <WeeklyAgendaEventCard
                            key={ev.id}
                            evento={ev}
                            idx={idx}
                            periodKey={key}
                            onSelect={onEventClick}
                            showPreletorCards={showPreletorCards}
                            tituloCorBarraMap={tituloCorBarraMap}
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

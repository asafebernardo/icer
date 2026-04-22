import { useState, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutList,
  ListChecks,
  Plus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import MonthlyCalendar from "../components/agenda/MonthlyCalendar";
import WeeklyCalendar from "../components/agenda/WeeklyCalendar";
import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { listEventosMerged } from "@/lib/eventosQuery";

/* 🔹 Tipo básico do Evento (ajuste depois conforme API) */
type Evento = {
  id: string;
  titulo?: string;
  data?: string;
  [key: string]: any;
};

export default function Agenda() {
  const [view, setView] = useState<"mensal" | "semanal">("mensal");
  const navigate = useNavigate();
  const [canCreateEvento, setCanCreateEvento] = useState(() =>
    canMenuAction(getUser(), MENU.EVENTOS, "create"),
  );

  const [monthDate, setMonthDate] = useState<Date>(startOfMonth(new Date()));

  const [weekDate, setWeekDate] = useState<Date>(
    startOfWeek(new Date(), { locale: ptBR }),
  );

  const { data: eventos = [], isLoading } = useQuery<Evento[]>({
    queryKey: ["eventos"],
    queryFn: () => listEventosMerged() as Promise<Evento[]>,
  });

  useEffect(() => {
    const sync = () =>
      setCanCreateEvento(canMenuAction(getUser(), MENU.EVENTOS, "create"));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("icer-member-permissions", sync);
    window.addEventListener("icer-user-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("icer-member-permissions", sync);
      window.removeEventListener("icer-user-session", sync);
    };
  }, []);

  const handleEventClick = (evento: Evento) => {
    if (!evento?.id) return;
    navigate(`/Evento/${evento.id}`);
  };

  // Navegação
  const prevPeriod = () =>
    view === "mensal"
      ? setMonthDate((m) => subMonths(m, 1))
      : setWeekDate((w) => subWeeks(w, 1));

  const nextPeriod = () =>
    view === "mensal"
      ? setMonthDate((m) => addMonths(m, 1))
      : setWeekDate((w) => addWeeks(w, 1));

  const goToday = () => {
    setMonthDate(startOfMonth(new Date()));
    setWeekDate(startOfWeek(new Date(), { locale: ptBR }));
  };

  // Label do período
  const periodLabel =
    view === "mensal"
      ? format(monthDate, "MMMM 'de' yyyy", { locale: ptBR })
      : (() => {
          const ws = startOfWeek(weekDate, { locale: ptBR });
          const we = endOfWeek(weekDate, { locale: ptBR });
          return `${format(ws, "d 'de' MMM", { locale: ptBR })} – ${format(
            we,
            "d 'de' MMM",
            { locale: ptBR },
          )}`;
        })();

  const weekDays = eachDayOfInterval({
    start: startOfWeek(weekDate, { locale: ptBR }),
    end: endOfWeek(weekDate, { locale: ptBR }),
  });

  return (
    <div>
      <PageHeader
        pageKey="agenda"
        tag="Calendário"
        title="Agenda"
        description="A programação da igreja em calendário: cultos, estudos e encontros para acompanhar e participar."
      />

      <section className="py-10 lg:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex bg-muted rounded-xl p-1 gap-1 w-fit">
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-background shadow text-foreground">
                <CalendarDays className="w-4 h-4" /> Agenda
              </span>

              <Link to="/Eventos">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ListChecks className="w-4 h-4" /> Eventos
                </button>
              </Link>
            </div>
          </div>

          {canCreateEvento ? (
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              A agenda só usa a{" "}
              <span className="font-medium text-foreground">data</span> de cada
              evento para posicioná-lo no calendário.{" "}
              <Link
                to="/Eventos"
                className="text-accent font-medium underline-offset-4 hover:underline"
              >
                Cadastre e edite eventos na página Eventos
              </Link>
              .
            </p>
          ) : null}

          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={prevPeriod}>
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <span className="font-semibold text-foreground text-sm sm:text-base capitalize">
                {periodLabel}
              </span>

              <Button variant="outline" size="icon" onClick={nextPeriod}>
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={goToday}>
                Hoje
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                <button
                  onClick={() => setView("mensal")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    view === "mensal"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" /> Mensal
                </button>

                <button
                  onClick={() => setView("semanal")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    view === "semanal"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" /> Semanal
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="h-[500px] bg-muted rounded-2xl animate-pulse" />
          ) : view === "mensal" ? (
            <MonthlyCalendar
              monthDate={monthDate}
              eventos={eventos}
              onEventClick={handleEventClick}
              onDayClick={(day: Date) => {}}
            />
          ) : (
            <WeeklyCalendar
              weekDays={weekDays}
              eventos={eventos}
              onEventClick={handleEventClick}
            />
          )}
        </div>
      </section>
    </div>
  );
}

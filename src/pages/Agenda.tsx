import { useState, useEffect, useRef } from "react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutList,
  Table2,
  Check,
  Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import MonthlyCalendar from "../components/agenda/MonthlyCalendar";
import MonthlyAgendaSimple from "../components/agenda/MonthlyAgendaSimple";
import WeeklyCalendar from "../components/agenda/WeeklyCalendar";
import AgendaMensalMobile from "@/components/agenda/mobile-monthly/AgendaMensalMobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { listEventosMerged } from "@/lib/eventosQuery";
import { useTituloCorBarraMap } from "@/hooks/useTituloCorBarraMap";

/* 🔹 Tipo básico do Evento (ajuste depois conforme API) */
type Evento = {
  id: string;
  titulo?: string;
  data?: string;
  [key: string]: any;
};

type AgendaView = "mensal" | "semanal" | "simples";

function AgendaToolbar({
  view,
  setView,
  periodLabel,
  prevPeriod,
  nextPeriod,
  goToday,
  showPreletorCards,
  setShowPreletorCards,
  canCreateEvento,
}: {
  view: AgendaView;
  setView: (v: AgendaView) => void;
  periodLabel: string;
  prevPeriod: () => void;
  nextPeriod: () => void;
  goToday: () => void;
  showPreletorCards: boolean;
  setShowPreletorCards: (v: boolean | ((b: boolean) => boolean)) => void;
  canCreateEvento: boolean;
}) {
  return (
    <>
      {canCreateEvento ? (
        <>
          <p className="mb-4 hidden max-w-2xl text-sm text-muted-foreground sm:block">
            A agenda só usa a{" "}
            <span className="font-medium text-foreground">data</span> de cada evento
            para posicioná-lo no calendário.{" "}
            <Link
              to="/Eventos"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Cadastre e edite eventos na página Eventos
            </Link>
            .
          </p>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground sm:hidden">
            <span className="font-medium text-foreground">Data</span> de cada evento na
            grelha.{" "}
            <Link
              to="/Eventos"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Editar em Eventos
            </Link>
            .
          </p>
        </>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" size="icon" onClick={prevPeriod} aria-label="Período anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="min-w-0 flex-1 text-center text-sm font-semibold capitalize text-foreground sm:flex-none sm:text-base">
            {periodLabel}
          </span>

          <Button variant="outline" size="icon" onClick={nextPeriod} aria-label="Período seguinte">
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={goToday} className="shrink-0">
            Hoje
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {view !== "simples" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={showPreletorCards ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowPreletorCards((v) => !v)}
                >
                  {showPreletorCards ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {showPreletorCards ? "Preletores: ativo" : "Preletores: inativo"}
                  </span>
                  <span className="sm:hidden">
                    {showPreletorCards ? "Preletores (sim)" : "Preletores (não)"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Mostra o preletor em cada card do calendário (título + preletor).
              </TooltipContent>
            </Tooltip>
          ) : null}
          <div
            className="inline-flex max-w-full flex-wrap items-center gap-0.5 overflow-x-auto rounded-xl border border-border/70 bg-muted/50 p-1 shadow-inner [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Tipo de vista da agenda"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "mensal"}
              onClick={() => setView("mensal")}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3 ${
                view === "mensal"
                  ? "bg-background font-semibold text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              Mensal
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={view === "semanal"}
              onClick={() => setView("semanal")}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3 ${
                view === "semanal"
                  ? "bg-background font-semibold text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              Semanal
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={view === "simples"}
              onClick={() => setView("simples")}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3 ${
                view === "simples"
                  ? "bg-background font-semibold text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Table2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              Simples
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Agenda() {
  const [view, setView] = useState<AgendaView>("mensal");
  const [simpleModalOpen, setSimpleModalOpen] = useState(false);
  const prevViewRef = useRef<AgendaView>("mensal");
  const [showPreletorCards, setShowPreletorCards] = useState(false);
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

  const tituloCorBarraMap = useTituloCorBarraMap();

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

  useEffect(() => {
    if (view === "simples" && prevViewRef.current !== "simples") {
      setSimpleModalOpen(true);
    }
    if (view !== "simples") {
      setSimpleModalOpen(false);
    }
    prevViewRef.current = view;
  }, [view]);

  const handleEventClick = (evento: Evento) => {
    if (!evento?.id) return;
    setSimpleModalOpen(false);
    navigate(`/Evento/${evento.id}`);
  };

  // Navegação
  const prevPeriod = () =>
    view === "semanal"
      ? setWeekDate((w) => subWeeks(w, 1))
      : setMonthDate((m) => subMonths(m, 1));

  const nextPeriod = () =>
    view === "semanal"
      ? setWeekDate((w) => addWeeks(w, 1))
      : setMonthDate((m) => addMonths(m, 1));

  const goToday = () => {
    setMonthDate(startOfMonth(new Date()));
    setWeekDate(startOfWeek(new Date(), { locale: ptBR }));
  };

  // Label do período
  const periodLabel =
    view === "semanal"
      ? (() => {
          const ws = startOfWeek(weekDate, { locale: ptBR });
          const we = endOfWeek(weekDate, { locale: ptBR });
          return `${format(ws, "d 'de' MMM", { locale: ptBR })} – ${format(
            we,
            "d 'de' MMM",
            { locale: ptBR },
          )}`;
        })()
      : format(monthDate, "MMMM 'de' yyyy", { locale: ptBR });

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
          <div className="sm:hidden">
            <AgendaToolbar
              view={view}
              setView={setView}
              periodLabel={periodLabel}
              prevPeriod={prevPeriod}
              nextPeriod={nextPeriod}
              goToday={goToday}
              showPreletorCards={showPreletorCards}
              setShowPreletorCards={setShowPreletorCards}
              canCreateEvento={canCreateEvento}
            />
            {isLoading ? (
              <div className="h-72 rounded-2xl bg-muted animate-pulse" />
            ) : view === "mensal" ? (
              <AgendaMensalMobile events={eventos} />
            ) : view === "simples" ? (
              <div className="rounded-xl border border-border/70 bg-muted/10 px-4 py-10 text-center shadow-inner">
                <p className="text-sm font-medium text-foreground">Vista simples</p>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                  Tabela só com os dias em que há eventos. Abra a janela para ver em grande e
                  descarregar PNG.
                </p>
                <Button
                  type="button"
                  className="mt-6"
                  onClick={() => setSimpleModalOpen(true)}
                >
                  Abrir agenda simples
                </Button>
              </div>
            ) : (
              <WeeklyCalendar
                weekDays={weekDays}
                eventos={eventos}
                showPreletorCards={showPreletorCards}
                onEventClick={handleEventClick}
                tituloCorBarraMap={tituloCorBarraMap}
              />
            )}
          </div>

          <div className="hidden sm:block">
            <AgendaToolbar
              view={view}
              setView={setView}
              periodLabel={periodLabel}
              prevPeriod={prevPeriod}
              nextPeriod={nextPeriod}
              goToday={goToday}
              showPreletorCards={showPreletorCards}
              setShowPreletorCards={setShowPreletorCards}
              canCreateEvento={canCreateEvento}
            />

            {isLoading ? (
              <div className="h-[500px] rounded-2xl bg-muted animate-pulse" />
            ) : view === "mensal" ? (
              <MonthlyCalendar
                monthDate={monthDate}
                eventos={eventos}
                showPreletorCards={showPreletorCards}
                onEventClick={handleEventClick}
                onDayClick={() => {}}
                tituloCorBarraMap={tituloCorBarraMap}
              />
            ) : view === "simples" ? (
              <div className="rounded-xl border border-border/70 bg-muted/10 px-4 py-12 text-center shadow-inner">
                <p className="text-base font-medium text-foreground">Vista simples</p>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                  Tabela só com os dias em que há eventos. Abra a janela para ver em grande e
                  descarregar PNG.
                </p>
                <Button
                  type="button"
                  className="mt-8"
                  size="lg"
                  onClick={() => setSimpleModalOpen(true)}
                >
                  Abrir agenda simples
                </Button>
              </div>
            ) : (
              <WeeklyCalendar
                weekDays={weekDays}
                eventos={eventos}
                showPreletorCards={showPreletorCards}
                onEventClick={handleEventClick}
                tituloCorBarraMap={tituloCorBarraMap}
              />
            )}
          </div>

          <Dialog open={simpleModalOpen} onOpenChange={setSimpleModalOpen}>
            <DialogContent
              hideClose
              className="left-[50%] top-[2vh] max-h-[96vh] w-[calc(100vw-0.5rem)] max-w-[calc(100vw-0.5rem)] translate-x-[-50%] translate-y-0 gap-0 overflow-y-auto border-border/60 p-0 pb-1 pt-0 shadow-md"
            >
              <DialogTitle className="sr-only">
                Agenda simples — {periodLabel}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Tabela dos dias com eventos neste período. Use Download na barra superior.
              </DialogDescription>
              {isLoading ? (
                <div className="h-48 rounded-lg bg-muted animate-pulse" />
              ) : (
                <MonthlyAgendaSimple monthDate={monthDate} eventos={eventos} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}

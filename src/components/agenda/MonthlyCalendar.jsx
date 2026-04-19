import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { eventCardBarClass } from "@/lib/eventCardColors";

const categoriaColors = {
  culto: "bg-blue-500",
  estudo: "bg-purple-500",
  jovens: "bg-green-500",
  mulheres: "bg-pink-500",
  homens: "bg-indigo-500",
  criancas: "bg-yellow-500",
  especial: "bg-orange-500",
  conferencia: "bg-red-500",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function MonthlyCalendar({
  monthDate,
  eventos,
  onEventClick,
  onDayClick,
}) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Padding inicial (dias antes do primeiro dia do mês)
  const startPad = getDay(monthStart); // 0=Dom
  const paddingDays = Array.from({ length: startPad });

  const getEventosForDay = (day) =>
    eventos.filter((e) => {
      if (!e.data) return false;
      return isSameDay(new Date(e.data + "T00:00:00"), day);
    });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {/* Padding */}
        {paddingDays.map((_, i) => (
          <div
            key={`pad-${i}`}
            className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border/50 bg-muted/20"
          />
        ))}

        {/* Dias do mês */}
        {days.map((day, i) => {
          const dayEventos = getEventosForDay(day);
          const isLast = (startPad + i + 1) % 7 === 0;
          const today = isToday(day);

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.01 }}
              onClick={() =>
                dayEventos.length > 0 &&
                onDayClick &&
                onDayClick(day, dayEventos)
              }
              className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border/50 p-1.5 flex flex-col gap-1 transition-colors
                ${!isLast ? "" : "border-r-0"}
                ${dayEventos.length > 0 ? "cursor-pointer hover:bg-accent/5" : ""}
              `}
            >
              {/* Número do dia */}
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold shrink-0
                ${today ? "bg-accent text-accent-foreground" : "text-foreground"}
              `}
              >
                {format(day, "d")}
              </div>

              {/* Eventos: só barra de cor + card + título */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[4.5rem] sm:max-h-[5.5rem] pr-0.5">
                {dayEventos.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className="w-full text-left rounded-lg border border-border bg-card overflow-hidden shadow-sm hover:border-accent/50 transition-colors shrink-0"
                  >
                    <div
                      className={`h-1 w-full ${eventCardBarClass(ev, categoriaColors)}`}
                    />
                    <div className="px-1 py-1">
                      <span className="text-[10px] font-semibold text-foreground line-clamp-2 leading-tight block">
                        {ev.titulo}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

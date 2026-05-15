import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";
import { Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { periodKeyFromTimeString } from "@/lib/eventPeriod";
import {
  DEFAULT_AGENDA_SIMPLE_GRID,
  mergeAgendaSimpleGrid,
} from "@/lib/agendaSimpleGridDefaults";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
} from "@/lib/publicWorkspace";
import { cn } from "@/lib/utils";

function columnKeyForEvent(ev) {
  const cat = String(ev.categoria || "").toLowerCase().trim();
  const period = periodKeyFromTimeString(ev.horario);

  if (cat === "estudo") return "oracao";
  if (cat === "culto") {
    if (period === "manha") return "manha";
    if (period === "tarde" || period === "noite") return "noite";
    return "outras";
  }
  return "outras";
}

/** Aplica regras de dia da semana (config admin) sobre a coluna base. */
function bucketColumnKeyForEvent(ev, grid, eventDate) {
  const base = columnKeyForEvent(ev);
  const dow = eventDate.getDay();
  if (
    (base === "manha" || base === "noite") &&
    Array.isArray(grid.culto_weekdays) &&
    grid.culto_weekdays.length > 0
  ) {
    if (!grid.culto_weekdays.includes(dow)) return "outras";
  }
  if (
    base === "oracao" &&
    Array.isArray(grid.oracao_weekdays) &&
    grid.oracao_weekdays.length > 0
  ) {
    if (!grid.oracao_weekdays.includes(dow)) return "outras";
  }
  return base;
}

function bucketEventsForDay(dayEventos, grid, day) {
  const buckets = { manha: [], noite: [], oracao: [], outras: [] };
  for (const ev of dayEventos) {
    buckets[bucketColumnKeyForEvent(ev, grid, day)].push(ev);
  }
  return buckets;
}

/** Sigla do dia da semana (pt-BR) + número do dia (ex.: SEG / 13). */
function formatDateCellParts(day) {
  const sigla = format(day, "EEE", { locale: ptBR })
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim()
    .toUpperCase();
  const numero = format(day, "d", { locale: ptBR });
  return { sigla, numero };
}

function formatMonthTitle(monthDate) {
  const m = format(monthDate, "MMMM", { locale: ptBR }).toUpperCase();
  const y = format(monthDate, "yyyy");
  return `${m}/${y}`;
}

function fileSlugFromMonth(monthDate) {
  const m = format(monthDate, "MMMM", { locale: ptBR })
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const y = format(monthDate, "yyyy");
  return `agenda-simples-${m}-${y}`.replace(/\s+/g, "-");
}

function CellStack({ events }) {
  if (!events?.length) {
    return (
      <span className="flex min-h-[1.375rem] items-center justify-center px-0.5 py-px text-center text-sm font-medium text-muted-foreground/80">
        —
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-px py-px">
      {events.map((ev) => {
        const titulo = String(ev.titulo || "").trim().toUpperCase() || "—";
        const prel = String(ev.preletor || "").trim();

        return (
          <div
            key={ev.id}
            className="w-full px-0.5 py-px text-center"
          >
            <span className="block text-sm font-bold uppercase leading-snug tracking-tight text-foreground">
              {titulo}
            </span>
            {prel ? (
              <span className="mt-0.5 block text-xs font-semibold normal-case leading-snug text-muted-foreground">
                {prel}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Vista mensal em tabela (só dias com eventos). Pensado para uso dentro de um diálogo amplo.
 */
export default function MonthlyAgendaSimple({ monthDate, eventos }) {
  const exportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const { data: publicWs } = useQuery({
    queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
    queryFn: fetchPublicWorkspaceJson,
    staleTime: 30_000,
  });

  const grid = useMemo(
    () =>
      mergeAgendaSimpleGrid(
        DEFAULT_AGENDA_SIMPLE_GRID,
        publicWs?.agenda_simple_grid,
      ),
    [publicWs?.agenda_simple_grid],
  );

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventosForDay = (day) =>
    eventos.filter((e) => {
      if (!e.data) return false;
      return isSameDay(new Date(e.data + "T00:00:00"), day);
    });

  const daysWithEvents = days.filter((day) => getEventosForDay(day).length > 0);

  const downloadPng = useCallback(async () => {
    const el = exportRef.current;
    if (!el || daysWithEvents.length === 0) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Não foi possível criar o ficheiro PNG."));
              return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${fileSlugFromMonth(monthDate)}.png`;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            resolve();
          },
          "image/png",
          1.0,
        );
      });
      toast.success("PNG descarregado.");
    } catch (err) {
      toast.error("Não foi possível gerar o PNG.", {
        description: String(err?.message || err),
      });
    } finally {
      setDownloading(false);
    }
  }, [daysWithEvents.length, monthDate, eventos]);

  const th = (extra) =>
    cn(
      "border border-border/90 px-1.5 py-1 text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-foreground antialiased sm:text-xs",
      extra,
    );

  const td = (bg) =>
    cn(
      "border border-border/80 align-top text-foreground transition-colors px-1.5 py-0.5",
      bg,
    );

  return (
    <div className="flex flex-col gap-0">
      <div className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-border/60 bg-background px-1 sm:gap-2 sm:px-2">
        <div aria-hidden className="min-w-0" />
        {daysWithEvents.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            disabled={downloading}
            onClick={downloadPng}
            className={cn(
              "gap-2 px-3 font-medium",
              "text-emerald-600 hover:bg-emerald-500/12 hover:text-emerald-700",
              "dark:text-emerald-400 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300",
              "disabled:pointer-events-none disabled:opacity-45",
            )}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4 shrink-0" aria-hidden />
            )}
            Download
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">Sem eventos</span>
        )}
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-foreground/85 hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </DialogClose>
        </div>
      </div>

      {daysWithEvents.length === 0 ? (
        <p className="mx-2 my-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-5 text-center text-sm text-muted-foreground sm:mx-3">
          Nenhum evento neste mês.
        </p>
      ) : (
        <div className="w-full overflow-x-auto px-0">
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full min-w-0"
          >
            <div ref={exportRef} className="bg-background">
              <table className="table-auto w-full min-w-0 border-collapse text-foreground">
                  <thead className="sticky top-0 z-20 shadow-[0_1px_0_0_hsl(var(--border))]">
                    <tr>
                      <th
                        colSpan={5}
                        className={cn(
                          th(),
                          "bg-gradient-to-r from-primary/15 via-accent/12 to-primary/12 py-1.5 text-sm font-display font-semibold tracking-[0.08em] text-foreground sm:text-base",
                        )}
                      >
                        {formatMonthTitle(monthDate)}
                      </th>
                    </tr>
                    <tr>
                      <th
                        rowSpan={2}
                        className={cn(
                          th("w-px whitespace-nowrap bg-muted/95 backdrop-blur-sm px-1.5"),
                        )}
                      >
                        {grid.dia_column_label}
                      </th>
                      <th
                        colSpan={2}
                        className={cn(
                          th(
                            "min-w-0 bg-emerald-200/95 text-emerald-950 dark:bg-emerald-900/65 dark:text-emerald-50",
                          ),
                        )}
                      >
                        {grid.cultos_group_label}
                      </th>
                      <th
                        rowSpan={2}
                        className={cn(
                          th(
                            "min-w-[10rem] max-w-[18rem] bg-sky-200/95 text-sky-950 backdrop-blur-sm dark:bg-sky-900/60 dark:text-sky-50",
                          ),
                        )}
                      >
                        {grid.reuniao_oracao_line1}
                        {String(grid.reuniao_oracao_line2 || "").trim() ? (
                          <>
                            <br />
                            {grid.reuniao_oracao_line2}
                          </>
                        ) : null}
                      </th>
                      <th
                        rowSpan={2}
                        className={cn(
                          th(
                            "min-w-[10rem] max-w-[18rem] bg-amber-100/95 text-amber-950 backdrop-blur-sm dark:bg-amber-950/40 dark:text-amber-50",
                          ),
                        )}
                      >
                        {grid.outras_line1}
                        {String(grid.outras_line2 || "").trim() ? (
                          <>
                            <br />
                            {grid.outras_line2}
                          </>
                        ) : null}
                      </th>
                    </tr>
                    <tr>
                      <th
                        className={cn(
                          th(
                            "min-w-[9.5rem] bg-emerald-100/95 text-emerald-950 dark:bg-emerald-900/55 dark:text-emerald-50",
                          ),
                        )}
                      >
                        {grid.manha_label}
                      </th>
                      <th
                        className={cn(
                          th(
                            "min-w-[9.5rem] bg-emerald-100/95 text-emerald-950 dark:bg-emerald-900/55 dark:text-emerald-50",
                          ),
                        )}
                      >
                        {grid.noite_label}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysWithEvents.map((day, i) => {
                      const dayEventos = getEventosForDay(day);
                      const b = bucketEventsForDay(dayEventos, grid, day);
                      const { sigla, numero } = formatDateCellParts(day);

                      return (
                        <motion.tr
                          key={day.toISOString()}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.012, 0.18) }}
                          className={cn(
                            "border-b border-border/50 odd:bg-background even:bg-muted/[0.28]",
                            "hover:bg-muted/40",
                          )}
                        >
                          <td
                            className={cn(
                              td("w-px whitespace-nowrap bg-muted/45 px-1.5 text-center font-bold uppercase tracking-tight text-foreground"),
                            )}
                          >
                            <span className="inline-flex flex-col items-center gap-px leading-none">
                              <span className="text-[0.65rem] font-bold tracking-tight sm:text-xs">
                                {sigla}
                              </span>
                              <span className="text-sm font-bold tabular-nums sm:text-base">
                                {numero}
                              </span>
                            </span>
                          </td>
                          <td className={td("bg-emerald-50/90 dark:bg-emerald-950/20")}>
                            <CellStack events={b.manha} />
                          </td>
                          <td className={td("bg-emerald-50/90 dark:bg-emerald-950/20")}>
                            <CellStack events={b.noite} />
                          </td>
                          <td className={td("bg-sky-50/85 dark:bg-sky-950/20")}>
                            <CellStack events={b.oracao} />
                          </td>
                          <td className={td("bg-amber-50/75 dark:bg-amber-950/18")}>
                            <CellStack events={b.outras} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
      )}
    </div>
  );
}

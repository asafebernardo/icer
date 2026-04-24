import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import { Link, useSearchParams } from "react-router-dom";
import { format, parseISO, isFuture, isPast, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  MapPin,
  Mic2,
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  CalendarDays,
  ListChecks,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import PageHeader from "../components/shared/PageHeader";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import EventoFormPanel from "../components/agenda/EventoFormPanel";
import BulkEventScheduler from "../components/agenda/BulkEventScheduler";
import BulkEventRunsDialog from "../components/agenda/BulkEventRunsDialog";
import { canMenuAction, MENU } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { listEventosMerged } from "@/lib/eventosQuery";
import { eventCardBarClass } from "@/lib/eventCardColors";
import { getSiteConfig, refreshPublicSiteConfig, savePublicSiteConfigAdmin } from "@/lib/siteConfig";
import {
  CATEGORY_BAR_CLASS,
  CATEGORY_SOFT_BADGE_CLASS,
} from "@/lib/categoryAppearance";

const categoriaLabels = {
  culto: "Culto",
  estudo: "Estudo",
  jovens: "Jovens",
  mulheres: "Mulheres",
  homens: "Homens",
  criancas: "Crianças",
  especial: "Especial",
  conferencia: "Conferência",
};

const categoriaBg = CATEGORY_BAR_CLASS;

const categoriaLight = CATEGORY_SOFT_BADGE_CLASS;

function getDestaqueId() {
  return String(getSiteConfig().eventoDestaqueId || "").trim();
}

/** Na aba "Próximo evento": só o evento futuro mais próximo da data atual. */
const PROXIMOS_MAX = 1;

function EventoCard({
  evento,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleDestaque,
  isDestaque,
}) {
  const date = evento.data ? parseISO(evento.data) : null;
  const passado = date && isPast(new Date(evento.data + "T23:59:59"));
  const hasImage = Boolean((evento.imagem_url || "").trim());
  /** Sobre a imagem: degradê neutro a partir da cor de texto do tema */
  const gradientSplitStyle = {
    background:
      "linear-gradient(90deg, hsl(var(--foreground) / 0.88) 0%, hsl(var(--foreground) / 0.42) 38%, hsl(var(--foreground) / 0.1) 72%, transparent 100%)",
  };

  const barColor = eventCardBarClass(evento, categoriaBg);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${passado ? "opacity-60" : ""} ${isDestaque ? "border-accent ring-2 ring-accent/30" : "border-border"} relative bg-card`}
    >
      <div className={`h-1.5 relative z-20 ${barColor}`} />
      <div className={hasImage ? "flex flex-col md:flex-row md:min-h-[200px]" : "flex flex-col"}>
        {/* Esquerda: texto e meta (sem ícone grande da data) */}
        <div
          className={
            hasImage
              ? "relative z-10 flex-1 md:w-1/2 md:max-w-[50%] p-5 flex flex-col justify-between min-w-0"
              : "relative z-10 flex-1 p-5 flex flex-col justify-between min-w-0"
          }
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {isDestaque && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                  <Star className="w-3 h-3 fill-accent" /> Destaque
                </span>
              )}
              {evento.categoria && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${categoriaLight[evento.categoria] || "bg-muted text-muted-foreground"}`}
                >
                  {categoriaLabels[evento.categoria] || evento.categoria}
                </span>
              )}
              {passado && (
                <span className="text-xs text-muted-foreground">
                  (Encerrado)
                </span>
              )}
              {!hasImage && date && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  {format(date, "d 'de' MMM", { locale: ptBR })}
                </span>
              )}
            </div>
            <h3 className="font-bold text-foreground text-base leading-snug">
              {evento.titulo}
            </h3>
            {evento.descricao && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {evento.descricao}
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {evento.horario && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  {evento.horario}
                  {evento.horario_fim ? ` – ${evento.horario_fim}` : ""}
                </span>
              )}
              {evento.local && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-accent" />
                  {evento.local}
                </span>
              )}
              {evento.preletor && (
                <span className="flex items-center gap-1">
                  <Mic2 className="w-3.5 h-3.5 text-accent" />
                  {evento.preletor}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Direita: imagem + degradê + bloco da data (somente quando há imagem) */}
        {hasImage ? (
          <div className="relative md:w-1/2 md:max-w-[50%] min-h-[160px] md:min-h-0 border-t md:border-t-0 md:border-l border-border/60">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${evento.imagem_url})` }}
            />
            <div
              className="absolute inset-0 z-[1] pointer-events-none"
              style={gradientSplitStyle}
            />
            {date && (
              <div
                className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-xl text-white flex flex-col items-center justify-center shadow-lg ring-2 ring-white/25 ${barColor}`}
              >
                <span className="text-2xl font-bold leading-none">
                  {format(date, "d")}
                </span>
                <span className="text-[10px] font-semibold uppercase leading-tight">
                  {format(date, "MMM", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Ações */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-5 py-4 border-t border-border/60 bg-card/50">
          <Link to={`/Evento/${evento.id}`}>
            <Button size="sm" variant="outline" className="text-xs">
              Ver detalhes & Inscrição
            </Button>
          </Link>
          {canEdit || canDelete ? (
            <div className="flex gap-1">
              {canEdit ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title={
                    isDestaque
                      ? "Remover destaque"
                      : "Marcar como destaque no topo"
                  }
                  onClick={() => onToggleDestaque(evento.id)}
                >
                  {isDestaque ? (
                    <StarOff className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <Star className="w-3.5 h-3.5" />
                  )}
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onEdit(evento)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(evento.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
    </motion.div>
  );
}

export default function Eventos() {
  const { user, navigateToLogin } = useAuth();
  const canCreate = canMenuAction(user, MENU.EVENTOS, "create");
  const canEdit = canMenuAction(user, MENU.EVENTOS, "edit");
  const canDelete = canMenuAction(user, MENU.EVENTOS, "delete");
  const canUseForm = canCreate || canEdit;
  const [editEvento, setEditEvento] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunsOpen, setBulkRunsOpen] = useState(false);
  const [destaqueId, setDestaqueIdState] = useState(getDestaqueId);
  const [eventoDeleteId, setEventoDeleteId] = useState(null);
  const [filtro, setFiltro] = useState("proximos"); // 'proximos' | 'todos'
  const [pageTodos, setPageTodos] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const sync = () => setDestaqueIdState(getDestaqueId());
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  useEffect(() => {
    if (searchParams.get("todos") === "1") {
      setFiltro("todos");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
  });

  const deleteEvento = useMutation({
    mutationFn: (id) => api.entities.Evento.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eventos"] }),
  });

  const handleEdit = (ev) => {
    setEditEvento(ev);
    setShowForm(true);
  };
  const handleNew = () => {
    setEditEvento(null);
    setShowForm(true);
  };
  const askDeleteEvento = (id) => setEventoDeleteId(id);
  const handleToggleDestaque = (id) => {
    const sid = String(id || "").trim();
    const novo = destaqueId === sid ? "" : sid;
    setDestaqueIdState(novo);
    if (canEdit) {
      savePublicSiteConfigAdmin({ eventoDestaqueId: novo })
        .then(() => refreshPublicSiteConfig())
        .catch(() => {});
    }
  };

  const sorted = [...eventos].sort((a, b) => {
    const cmp = (a.data || "").localeCompare(b.data || "");
    if (cmp !== 0) return cmp;
    return (a.horario || "").localeCompare(b.horario || "");
  });
  const proximos = sorted
    .filter((e) => e.data && isFuture(new Date(e.data + "T23:59:59")))
    .slice(0, PROXIMOS_MAX);

  useEffect(() => {
    // Trocar de aba/filtro volta à primeira página.
    setPageTodos(0);
  }, [filtro]);

  // Paginação (aba "Todos"):
  // - Se houver eventos no mês atual: listar só o mês atual com paginação (4 por página)
  // - Se não houver no mês atual: mostrar lista ordenada até 12 (sem paginação)
  const now = new Date();
  const mesAtual = sorted.filter((e) => {
    if (!e?.data) return false;
    try {
      return isSameMonth(parseISO(e.data), now);
    } catch {
      return false;
    }
  });
  const todosBase = mesAtual.length > 0 ? mesAtual : sorted.slice(0, 12);
  const pageSizeTodos = mesAtual.length > 0 ? 4 : 12;
  const totalPagesTodos = Math.max(1, Math.ceil(todosBase.length / pageSizeTodos));
  const todosPageItems =
    mesAtual.length > 0
      ? todosBase.slice(pageTodos * pageSizeTodos, (pageTodos + 1) * pageSizeTodos)
      : todosBase;

  const lista = filtro === "proximos" ? proximos : todosPageItems;

  // O popup de "evento em destaque" agora é global (Layout) e aparece em todos os menus (exceto admin).
  const destaqueEvento = eventos.find((e) => String(e.id) === String(destaqueId));

  return (
    <div>
      <PageHeader
        pageKey="eventos"
        tag="Programação"
        title="Eventos"
        description="Detalhes dos encontros da igreja: datas, horários, locais e programação para consultar e participar."
      />

      <section className="py-10 lg:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Alternância Agenda / Eventos + criar (alinhado à direita das abas) */}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex bg-muted rounded-xl p-1 gap-1 w-fit">
              <Link to="/Agenda">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <CalendarDays className="w-4 h-4" /> Agenda
                </button>
              </Link>
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-background shadow text-foreground">
                <ListChecks className="w-4 h-4" /> Eventos
              </span>
            </div>
            {canCreate ? (
              <div className="flex items-center gap-2 w-fit shrink-0">
                <Button type="button" variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
                  <span>Agendar em massa</span>
                  <span className="inline-flex items-center rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    Beta
                  </span>
                </Button>
                <Button type="button" variant="outline" onClick={() => setBulkRunsOpen(true)} className="gap-2">
                  <History className="w-4 h-4" />
                  Rotinas
                </Button>
                <Button type="button" onClick={handleNew} className="gap-2">
                  <Plus className="w-4 h-4" /> Novo evento
                </Button>
              </div>
            ) : null}
          </div>

          {canUseForm && (
            <EventoFormPanel
              open={showForm}
              evento={editEvento}
              existingEventos={eventos}
              onSaved={() => {
                setShowForm(false);
                setEditEvento(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditEvento(null);
              }}
            />
          )}

          {canCreate ? (
            <BulkEventScheduler
              open={bulkOpen}
              onOpenChange={setBulkOpen}
              existingEventos={eventos}
              onDone={() => {
                queryClient.invalidateQueries({ queryKey: ["eventos"] });
              }}
            />
          ) : null}

          {canCreate ? (
            <BulkEventRunsDialog
              open={bulkRunsOpen}
              onOpenChange={setBulkRunsOpen}
              onUndone={() => {
                queryClient.invalidateQueries({ queryKey: ["eventos"] });
              }}
            />
          ) : null}

          {/* Barra de controles */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setFiltro("proximos")}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${filtro === "proximos" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Próximo evento
                </button>
                <button
                  type="button"
                  onClick={() => setFiltro("todos")}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${filtro === "todos" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Todos ({sorted.length})
                </button>
              </div>
            </div>
            {!!user && !canCreate && !canEdit && !canDelete && (
              <p className="text-sm text-muted-foreground rounded-xl border border-border bg-muted/40 px-4 py-3">
                Para criar ou gerir eventos, o administrador deve conceder
                permissões em <strong className="text-foreground">Eventos</strong>{" "}
                no Dashboard, ou inicie sessão com uma conta autorizada em{" "}
                <button
                  type="button"
                  onClick={() => navigateToLogin()}
                  className="text-primary font-semibold underline-offset-2 hover:underline dark:text-accent"
                >
                  Iniciar sessão
                </button>
                .
              </p>
            )}
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 bg-muted rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>
                Nenhum evento {filtro === "proximos" ? "próximo" : ""}{" "}
                encontrado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtro === "todos" && mesAtual.length > 0 && todosBase.length > pageSizeTodos ? (
                <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
                  <p className="text-xs text-muted-foreground">
                    Mês atual: {mesAtual.length} evento(s)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pageTodos <= 0}
                      onClick={() => setPageTodos((p) => Math.max(0, p - 1))}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Página {Math.min(pageTodos + 1, totalPagesTodos)} / {totalPagesTodos}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pageTodos + 1 >= totalPagesTodos}
                      onClick={() => setPageTodos((p) => Math.min(totalPagesTodos - 1, p + 1))}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              ) : null}
              {lista.map((ev) => (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={handleEdit}
                  onDelete={askDeleteEvento}
                  onToggleDestaque={handleToggleDestaque}
                  isDestaque={String(ev.id) === String(destaqueId)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={eventoDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setEventoDeleteId(null);
        }}
        title="Excluir evento?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (eventoDeleteId != null) {
            deleteEvento.mutate(eventoDeleteId);
          }
        }}
      />
    </div>
  );
}

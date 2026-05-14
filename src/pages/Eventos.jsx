import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import { Link, useSearchParams } from "react-router-dom";
import { format, parseISO, isFuture, isPast, isSameMonth, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Mic2,
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { motion } from "framer-motion";
import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import EventoFormPanel from "../components/agenda/EventoFormPanel";
import { canMenuAction, MENU, isAdminUser } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { useEditMode } from "@/lib/EditModeContext";
import { listEventosMerged } from "@/lib/eventosQuery";
import { useTituloCorBarraMap } from "@/hooks/useTituloCorBarraMap";
import { useTituloImagensFundoMap } from "@/hooks/useTituloImagensFundoMap";
import { eventCardBarClass } from "@/lib/eventCardColors";
import { tituloImagensFundoUrls } from "@/lib/eventTitleCardBackgrounds";
import CadastroTitleBackground from "@/components/shared/CadastroTitleBackground";
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

/**
 * Devolve o dia da semana abreviado em pt-BR com inicial maiúscula e sem ponto:
 * "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb".
 */
function shortWeekdayPt(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  try {
    const raw = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(
      date,
    );
    const clean = String(raw).replace(/\.$/, "").trim();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  } catch {
    return "";
  }
}

/** Próximo evento futuro (cartão no topo). */
const PROXIMOS_MAX = 1;

function isEventoFuturo(e) {
  return Boolean(e?.data && isFuture(new Date(String(e.data) + "T23:59:59")));
}

function isEventoEncerrado(e) {
  return Boolean(e?.data && isPast(new Date(String(e.data) + "T23:59:59")));
}

/** Janela de tempo da lista pública de "Próximos eventos" — apenas os próximos 14 dias. */
const PROXIMOS_JANELA_DIAS = 14;

function isEventoNaJanela(e, hoje = new Date()) {
  if (!e?.data) return false;
  try {
    const inicioJanela = startOfDay(hoje);
    const fimJanela = addDays(inicioJanela, PROXIMOS_JANELA_DIAS);
    const fimDia = new Date(String(e.data) + "T23:59:59");
    return fimDia >= inicioJanela && fimDia < fimJanela;
  } catch {
    return false;
  }
}

function EventoCard({
  evento,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleDestaque,
  isDestaque,
  tituloCorBarraMap = {},
  tituloImagensFundoMap = {},
}) {
  const date = evento.data ? parseISO(evento.data) : null;
  const passado = date && isPast(new Date(evento.data + "T23:59:59"));
  const hasImage = Boolean((evento.imagem_url || "").trim());
  const cadastroBgUrls = useMemo(
    () => tituloImagensFundoUrls(evento, tituloImagensFundoMap),
    [evento?.titulo, evento?.imagem_url, tituloImagensFundoMap],
  );
  const showCadastroBg = cadastroBgUrls.length > 0;
  /** Sobre a imagem: degradê neutro a partir da cor de texto do tema */
  const gradientSplitStyle = {
    background:
      "linear-gradient(90deg, hsl(var(--foreground) / 0.88) 0%, hsl(var(--foreground) / 0.42) 38%, hsl(var(--foreground) / 0.1) 72%, transparent 100%)",
  };

  const barColor = eventCardBarClass(evento, categoriaBg, tituloCorBarraMap);
  const weekdayShort = date ? shortWeekdayPt(date) : "";

  /**
   * Variante compacta para eventos sem imagem: cartão pequeno com apenas
   * o dia da semana abreviado, o título e o horário. Categoria/local/preletor
   * ficam ocultos para reduzir altura — todos os detalhes continuam no link
   * "Ver detalhes".
   */
  if (!hasImage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border rounded-xl overflow-hidden shadow-sm card-hover ${passado ? "opacity-60" : ""} ${isDestaque ? "border-accent ring-2 ring-accent/30" : "border-border"} relative bg-card`}
      >
        {showCadastroBg ? (
          <CadastroTitleBackground urls={cadastroBgUrls} />
        ) : null}
        <div className={`h-1 relative z-20 ${barColor}`} />
        <div className="relative z-10 flex items-center gap-3 px-3 py-2.5 min-w-0">
          {/* Bloco do dia: "Qui · 14" — abreviação + dia do mês para contexto */}
          {date ? (
            <div
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-white text-center leading-tight shadow-sm ${barColor}`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-wider">
                {weekdayShort}
              </span>
              <span className="block text-base font-bold tabular-nums">
                {format(date, "d")}
              </span>
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isDestaque ? (
                <Star
                  className="w-3 h-3 fill-accent text-accent shrink-0"
                  aria-label="Destaque"
                />
              ) : null}
              <h3 className="font-semibold text-foreground text-sm leading-snug truncate">
                {evento.titulo}
              </h3>
            </div>
            {evento.horario || passado ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {evento.horario ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-accent shrink-0" />
                    {evento.horario}
                    {evento.horario_fim ? ` – ${evento.horario_fim}` : ""}
                  </span>
                ) : null}
                {passado ? (
                  <span className="text-[10px] uppercase tracking-wide">
                    Encerrado
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Link to={`/Evento/${evento.id}`}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1 text-foreground hover:text-accent"
                aria-label={`Ver detalhes de ${evento.titulo}`}
              >
                Detalhes
                <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
            {canEdit || canDelete ? (
              <div className="flex gap-0.5">
                {canEdit ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title={
                      isDestaque
                        ? "Remover destaque"
                        : "Marcar como destaque no topo"
                    }
                    onClick={() => onToggleDestaque(evento.id)}
                  >
                    {isDestaque ? (
                      <StarOff className="w-3 h-3 text-accent" />
                    ) : (
                      <Star className="w-3 h-3" />
                    )}
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => onEdit(evento)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => onDelete(evento.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-2xl overflow-hidden shadow-sm card-hover ${passado ? "opacity-60" : ""} ${isDestaque ? "border-accent ring-2 ring-accent/30" : "border-border"} relative bg-card`}
    >
      {showCadastroBg ? (
        <CadastroTitleBackground urls={cadastroBgUrls} />
      ) : null}
      <div className={`h-1.5 relative z-20 ${barColor}`} />
      <div className="flex flex-col md:flex-row md:min-h-[200px]">
        {/* Esquerda: texto e meta (sem ícone grande da data) */}
        <div className="relative z-10 flex-1 md:w-1/2 md:max-w-[50%] p-5 flex flex-col justify-between min-w-0">
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

        {/* Direita: imagem + degradê + bloco da data */}
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
  const { enabled: editMode } = useEditMode();
  const canCreateReal = canMenuAction(user, MENU.EVENTOS, "create");
  const canEditReal = canMenuAction(user, MENU.EVENTOS, "edit");
  const canDeleteReal = canMenuAction(user, MENU.EVENTOS, "delete");
  /** Versões "visuais": só mostra affordances de admin quando o Modo de edição está ativo. */
  const canCreate = canCreateReal && editMode;
  const canEdit = canEditReal && editMode;
  const canDelete = canDeleteReal && editMode;
  const canUseForm = canCreateReal || canEditReal;
  /** Apenas admins podem ver eventos encerrados (regra de privacidade pública). */
  const isAdmin = isAdminUser(user);
  const [editEvento, setEditEvento] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [destaqueId, setDestaqueIdState] = useState(getDestaqueId);
  const [eventoDeleteId, setEventoDeleteId] = useState(null);
  /**
   * Aba ativa da lista: "proximos" (público) ou "encerrados" (só admins).
   * Trocado de `verEncerrados` para um controlo de aba mais explícito.
   */
  const [aba, setAba] = useState("proximos");
  const verEncerrados = aba === "encerrados" && isAdmin;
  const [pageTodos, setPageTodos] = useState(0);
  /** Filtro de categoria. `null` = todas as categorias. */
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tituloCorBarraMap = useTituloCorBarraMap();
  const tituloImagensFundoMap = useTituloImagensFundoMap();

  useEffect(() => {
    const sync = () => setDestaqueIdState(getDestaqueId());
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  /** Links antigos ?todos=1 — remove o parâmetro sem mudar a vista (única vista). */
  useEffect(() => {
    if (searchParams.get("todos") === "1") {
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
    if (canEditReal) {
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
  const proximos = sorted.filter(isEventoFuturo).slice(0, PROXIMOS_MAX);

  useEffect(() => {
    setPageTodos(0);
  }, [verEncerrados, selectedCategoria]);

  /** Sessão sem privilégios: força a aba pública. */
  useEffect(() => {
    if (!isAdmin && aba === "encerrados") {
      setAba("proximos");
    }
  }, [isAdmin, aba]);

  // Paginação da lista:
  // - Com eventos no mês atual: grelha 2×3 → até 3 cartões por coluna (= 6 por página); lista sem o cartão de «destaque no site» (evita duplicar)
  // - Sem eventos no mês: até 12 ordenados, sem paginação, também sem o destaque no site na lista
  const COLUNAS_GRID_TODOS = 2;
  const POR_COLUNA_TODOS = 3;
  const PAGE_SIZE_TODOS_MES = COLUNAS_GRID_TODOS * POR_COLUNA_TODOS;
  const now = new Date();
  const mesAtual = sorted.filter((e) => {
    if (!e?.data) return false;
    try {
      return isSameMonth(parseISO(e.data), now);
    } catch {
      return false;
    }
  });
  const todosBaseRaw = mesAtual.length > 0 ? mesAtual : sorted.slice(0, 12);

  /**
   * Destaque do site só aparece se o evento ainda for futuro ou se quem estiver a ver
   * for admin — evita expor publicamente um evento marcado como destaque que entretanto
   * passou.
   */
  const destaqueEventoRaw = eventos.find(
    (e) => String(e.id) === String(destaqueId),
  );
  const destaqueEvento =
    destaqueEventoRaw && (!isEventoEncerrado(destaqueEventoRaw) || isAdmin)
      ? destaqueEventoRaw
      : null;
  const proximoEvento = proximos[0];

  const spotlightIds = new Set(
    [destaqueEvento?.id]
      .filter((id) => id != null && String(id).trim() !== "")
      .map((id) => String(id)),
  );

  const todosBaseFiltrada = todosBaseRaw.filter(
    (ev) => !spotlightIds.has(String(ev.id)),
  );

  /**
   * Próximos eventos do público: só os 14 dias seguintes; admins na aba
   * "encerrados" veem todos os passados sem janela.
   */
  const filtroTempo = (ev) => {
    if (verEncerrados) return isEventoEncerrado(ev);
    return isEventoNaJanela(ev, now);
  };

  const todosBasePorTempo = todosBaseFiltrada
    .filter(filtroTempo)
    .filter((ev) =>
      !selectedCategoria ? true : String(ev.categoria) === selectedCategoria,
    );

  /** Contagens por categoria sobre os eventos visíveis ANTES do filtro de categoria. */
  const baseContagem = todosBaseFiltrada.filter(filtroTempo);
  const contagemPorCategoria = baseContagem.reduce((acc, ev) => {
    const k = String(ev.categoria || "").trim();
    if (!k) return acc;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const totalPagesTodos =
    mesAtual.length > 0
      ? Math.max(1, Math.ceil(todosBasePorTempo.length / PAGE_SIZE_TODOS_MES))
      : 1;

  const todosPageItems =
    mesAtual.length > 0
      ? todosBasePorTempo.slice(
          pageTodos * PAGE_SIZE_TODOS_MES,
          pageTodos * PAGE_SIZE_TODOS_MES + PAGE_SIZE_TODOS_MES,
        )
      : todosBasePorTempo;

  const lista = todosPageItems;

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
          {canCreate ? (
            <div className="flex w-full flex-col gap-3 mb-6">
              <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                  <Button
                    type="button"
                    className="gap-2"
                    aria-label="Rotinas"
                    asChild
                  >
                    <Link to="/Eventos/rotinas">
                      <History className="w-4 h-4" />
                      <span className="hidden sm:inline">Rotinas</span>
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNew}
                    className="gap-2"
                    aria-label="Novo evento"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Novo evento</span>
                  </Button>
              </div>
            </div>
          ) : null}

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

          {!!user && !canCreateReal && !canEditReal && !canDeleteReal ? (
              <p className="mb-6 text-sm text-muted-foreground rounded-xl border border-border bg-muted/40 px-4 py-3">
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
          ) : null}

          {/* Filtros por categoria */}
          {!isLoading && Object.keys(contagemPorCategoria).length > 0 ? (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                Filtrar:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategoria(null)}
                aria-pressed={!selectedCategoria}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-ring ${
                  !selectedCategoria
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-foreground border-border hover:bg-muted/60"
                }`}
              >
                Todas
                <span className="text-[10px] opacity-80">
                  ({baseContagem.length})
                </span>
              </button>
              {Object.entries(categoriaLabels)
                .filter(([key]) => contagemPorCategoria[key] > 0)
                .map(([key, label]) => {
                  const active = selectedCategoria === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setSelectedCategoria(active ? null : key)
                      }
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-ring ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card text-foreground border-border hover:bg-muted/60"
                      }`}
                    >
                      {label}
                      <span className="text-[10px] opacity-80">
                        ({contagemPorCategoria[key]})
                      </span>
                    </button>
                  );
                })}
            </div>
          ) : null}

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
          ) : lista.length === 0 && !proximoEvento && !destaqueEvento ? (
            <EmptyState
              icon={CalendarOff}
              title={
                selectedCategoria
                  ? `Sem eventos em "${categoriaLabels[selectedCategoria] || selectedCategoria}"`
                  : verEncerrados
                    ? "Nenhum evento encerrado"
                    : "Nenhum evento futuro"
              }
              description={
                selectedCategoria
                  ? "Tente remover o filtro ou escolher outra categoria."
                  : verEncerrados
                    ? "Ainda não temos registos de eventos passados nesta vista."
                    : "Em breve vamos publicar os próximos eventos da agenda. Volte mais tarde."
              }
              action={
                selectedCategoria ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategoria(null)}
                  >
                    Limpar filtro
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="space-y-4">
              {destaqueEvento ? (
                <section
                  className="relative mb-2 overflow-hidden rounded-3xl border border-accent/35 bg-gradient-to-br from-primary/[0.09] via-background to-accent/[0.07] p-5 shadow-[0_16px_48px_-16px_hsl(var(--accent)/0.35)] ring-1 ring-accent/15 sm:p-6 lg:p-8 dark:from-primary/[0.14] dark:via-background dark:to-accent/[0.1]"
                  aria-labelledby="eventos-spotlight-heading"
                >
                  <div
                    className="pointer-events-none absolute -left-24 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -bottom-16 -right-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl"
                    aria-hidden
                  />
                  <div className="relative space-y-6">
                    <header className="border-b border-accent/30 pb-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                        Destaque no site
                      </p>
                      <h2
                        id="eventos-spotlight-heading"
                        className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                      >
                        Evento em evidência na agenda
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        O evento escolhido para aparecer em destaque no site (por exemplo na página inicial). Os restantes encontros futuros listam-se abaixo.
                      </p>
                    </header>

                    <div className="mx-auto max-w-2xl">
                      <EventoCard
                        evento={destaqueEvento}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={handleEdit}
                        onDelete={askDeleteEvento}
                        onToggleDestaque={handleToggleDestaque}
                        isDestaque={String(destaqueEvento.id) === String(destaqueId)}
                        tituloCorBarraMap={tituloCorBarraMap}
                        tituloImagensFundoMap={tituloImagensFundoMap}
                      />
                    </div>
                  </div>
                </section>
              ) : null}

                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {verEncerrados
                        ? "Eventos encerrados"
                        : `Próximos eventos · próximos ${PROXIMOS_JANELA_DIAS} dias`}
                    </p>
                    {isAdmin ? (
                      <Tabs
                        value={aba}
                        onValueChange={(v) =>
                          setAba(v === "encerrados" ? "encerrados" : "proximos")
                        }
                      >
                        <TabsList className="h-8">
                          <TabsTrigger
                            value="proximos"
                            className="text-xs px-2.5 py-1"
                          >
                            Próximos
                          </TabsTrigger>
                          <TabsTrigger
                            value="encerrados"
                            className="text-xs px-2.5 py-1"
                          >
                            Encerrados
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    ) : null}
                  </div>
                  {lista.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 [&>*]:min-w-0">
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
                          tituloCorBarraMap={tituloCorBarraMap}
                          tituloImagensFundoMap={tituloImagensFundoMap}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {verEncerrados
                        ? "Não há eventos encerrados para mostrar."
                        : `Nenhum evento publicado nos próximos ${PROXIMOS_JANELA_DIAS} dias.`}
                    </p>
                  )}
                </div>

                {mesAtual.length > 0 && totalPagesTodos > 1 ? (
                  <div className="flex justify-center pt-8 mt-2 border-t border-border/60 sm:justify-end">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={pageTodos <= 0}
                        onClick={() => setPageTodos((p) => Math.max(0, p - 1))}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground tabular-nums min-w-[3rem] text-center">
                        {Math.min(pageTodos + 1, totalPagesTodos)} / {totalPagesTodos}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={pageTodos + 1 >= totalPagesTodos}
                        onClick={() => setPageTodos((p) => Math.min(totalPagesTodos - 1, p + 1))}
                        aria-label="Próxima página"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
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

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      "linear-gradient(90deg, hsl(var(--foreground) / 0.72) 0%, hsl(var(--foreground) / 0.28) 42%, hsl(var(--foreground) / 0.06) 78%, transparent 100%)",
  };

  const barColor = eventCardBarClass(evento, categoriaBg, tituloCorBarraMap);
  const weekdayShort = date ? shortWeekdayPt(date) : "";

  /**
   * Variante compacta (sem imagem): uma linha — dia abreviado + número, título,
   * horário curto e ações. Destaque sem anel pesado; borda e fundo discretos.
   */
  if (!hasImage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border border-border/60 rounded-lg overflow-hidden shadow-none transition-colors hover:border-border ${passado ? "opacity-55" : ""} ${isDestaque ? "border-accent/50 bg-accent/[0.03]" : ""} relative bg-card`}
      >
        {showCadastroBg ? (
          <CadastroTitleBackground urls={cadastroBgUrls} />
        ) : null}
        <div className={`h-0.5 relative z-20 ${barColor}`} />
        <div className="relative z-10 flex flex-row items-center gap-2 px-2 py-1.5 min-w-0 sm:gap-2.5 sm:px-2.5">
          {date ? (
            <div
              className={`shrink-0 rounded-md px-1.5 py-1 text-white text-center leading-none ${barColor}`}
            >
              <span className="block text-[9px] font-semibold uppercase tracking-wide opacity-95">
                {weekdayShort}
              </span>
              <span className="block text-sm font-bold tabular-nums leading-tight">
                {format(date, "d")}
              </span>
            </div>
          ) : null}

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1 min-w-0">
              {isDestaque ? (
                <Star
                  className="w-2.5 h-2.5 shrink-0 fill-accent text-accent"
                  aria-label="Destaque"
                />
              ) : null}
              <h3 className="font-medium text-foreground text-xs leading-tight truncate sm:text-[13px]">
                {evento.titulo}
              </h3>
            </div>
            {evento.horario || passado ? (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                {evento.horario ? (
                  <span className="flex min-w-0 items-center gap-0.5 truncate">
                    <Clock className="w-2.5 h-2.5 shrink-0 text-accent/80" aria-hidden />
                    <span className="truncate">
                      {evento.horario}
                      {evento.horario_fim ? `–${evento.horario_fim}` : ""}
                    </span>
                  </span>
                ) : null}
                {passado ? (
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground/80">
                    Enc.
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Link to={`/Evento/${evento.id}`}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-1.5 text-[11px] gap-0.5 text-muted-foreground hover:text-foreground max-sm:min-h-[40px] max-sm:min-w-[40px] max-sm:px-2"
                aria-label={`Ver detalhes de ${evento.titulo}`}
              >
                <span className="max-sm:hidden">Detalhes</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
            {canEdit || canDelete ? (
              <div className="flex gap-0.5 max-sm:gap-1">
                {canEdit ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground max-sm:h-10 max-sm:w-10 max-sm:shrink-0"
                    title={
                      isDestaque
                        ? "Remover destaque"
                        : "Marcar como destaque no topo"
                    }
                    onClick={() => onToggleDestaque(evento.id)}
                  >
                    {isDestaque ? (
                      <StarOff className="w-3 h-3 text-accent max-sm:h-4 max-sm:w-4" />
                    ) : (
                      <Star className="w-3 h-3 max-sm:h-4 max-sm:w-4" />
                    )}
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground max-sm:h-10 max-sm:w-10 max-sm:shrink-0"
                    onClick={() => onEdit(evento)}
                  >
                    <Pencil className="w-3 h-3 max-sm:h-4 max-sm:w-4" />
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive/80 hover:text-destructive max-sm:h-10 max-sm:w-10 max-sm:shrink-0"
                    onClick={() => onDelete(evento.id)}
                  >
                    <Trash2 className="w-3 h-3 max-sm:h-4 max-sm:w-4" />
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border border-border/60 rounded-lg overflow-hidden shadow-none transition-colors hover:border-border ${passado ? "opacity-55" : ""} ${isDestaque ? "border-accent/50 bg-accent/[0.03]" : ""} relative bg-card`}
    >
      {showCadastroBg ? (
        <CadastroTitleBackground urls={cadastroBgUrls} />
      ) : null}
      <div className={`h-0.5 relative z-20 ${barColor}`} />
      <div className="flex flex-col sm:flex-row sm:min-h-0 md:min-h-[118px]">
        <div className="relative z-10 flex-1 sm:w-[55%] sm:max-w-[58%] p-3 flex flex-col justify-center min-w-0 sm:py-2.5 sm:pr-2">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {isDestaque ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent" title="Destaque">
                <Star className="w-2.5 h-2.5 fill-accent" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:inline">Destaque</span>
              </span>
            ) : null}
            {evento.categoria ? (
              <span
                className={`text-[10px] font-medium px-1.5 py-0 rounded-md border ${categoriaLight[evento.categoria] || "bg-muted text-muted-foreground"}`}
              >
                {categoriaLabels[evento.categoria] || evento.categoria}
              </span>
            ) : null}
            {passado ? (
              <span className="text-[10px] text-muted-foreground">Enc.</span>
            ) : null}
          </div>
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
            {evento.titulo}
          </h3>
          {evento.descricao ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              {evento.descricao}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
            {evento.horario ? (
              <span className="inline-flex items-center gap-0.5 min-w-0">
                <Clock className="w-3 h-3 shrink-0 text-accent/80" aria-hidden />
                <span className="truncate">
                  {evento.horario}
                  {evento.horario_fim ? `–${evento.horario_fim}` : ""}
                </span>
              </span>
            ) : null}
            {evento.local ? (
              <span className="inline-flex items-center gap-0.5 min-w-0 max-sm:max-w-full">
                <MapPin className="w-3 h-3 shrink-0 text-accent/80" aria-hidden />
                <span className="truncate">{evento.local}</span>
              </span>
            ) : null}
            {evento.preletor ? (
              <span className="inline-flex items-center gap-0.5 min-w-0 max-sm:max-w-full">
                <Mic2 className="w-3 h-3 shrink-0 text-accent/80" aria-hidden />
                <span className="truncate">{evento.preletor}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative sm:w-[45%] sm:min-w-0 min-h-[92px] sm:min-h-[118px] border-t sm:border-t-0 sm:border-l border-border/50">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${evento.imagem_url})` }}
          />
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={gradientSplitStyle}
          />
          {date ? (
            <div
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-md text-white flex flex-col items-center justify-center ${barColor}`}
            >
              <span className="text-lg font-bold leading-none tabular-nums">
                {format(date, "d")}
              </span>
              <span className="text-[9px] font-medium uppercase leading-none opacity-95">
                {format(date, "MMM", { locale: ptBR })}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 px-2.5 py-2 border-t border-border/40 bg-card/80 sm:justify-between">
        <Link to={`/Evento/${evento.id}`}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground max-sm:min-h-[40px] max-sm:px-3"
          >
            <span className="sm:hidden">Ver evento</span>
            <span className="hidden sm:inline">Detalhes e inscrição</span>
          </Button>
        </Link>
        {canEdit || canDelete ? (
          <div className="flex gap-0.5 max-sm:gap-1">
            {canEdit ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground max-sm:h-10 max-sm:w-10 max-sm:shrink-0"
                title={
                  isDestaque
                    ? "Remover destaque"
                    : "Marcar como destaque no topo"
                }
                onClick={() => onToggleDestaque(evento.id)}
              >
                {isDestaque ? (
                  <StarOff className="w-3 h-3 text-accent max-sm:h-4 max-sm:w-4" />
                ) : (
                  <Star className="w-3 h-3 max-sm:h-4 max-sm:w-4" />
                )}
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground max-sm:h-10 max-sm:w-10 max-sm:shrink-0"
                onClick={() => onEdit(evento)}
              >
                <Pencil className="w-3 h-3 max-sm:h-4 max-sm:w-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive/80 hover:text-destructive max-sm:h-10 max-sm:w-10 max-sm:shrink-0"
                onClick={() => onDelete(evento.id)}
              >
                <Trash2 className="w-3 h-3 max-sm:h-4 max-sm:w-4" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function Eventos({ embedded = false } = {}) {
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
      const tab = searchParams.get("tab");
      setSearchParams(tab ? { tab } : {}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const clearNovoParam = useCallback(() => {
    if (searchParams.get("novo") !== "1") return;
    const tab = searchParams.get("tab");
    setSearchParams(tab ? { tab } : {}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (embedded && searchParams.get("novo") === "1" && canCreate) {
      setEditEvento(null);
      setShowForm(true);
    }
  }, [embedded, searchParams, canCreate]);

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
      {!embedded ? (
        <PageHeader
          pageKey="eventos"
          tag="Programação"
          title="Eventos"
          description="Datas, horários e locais dos encontros."
        />
      ) : null}

      <section className={embedded ? "py-0" : "py-10 lg:py-14"}>
        <div
          className={
            embedded
              ? "w-full"
              : "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
          }
        >
          {canCreate && !embedded ? (
            <div className="flex w-full flex-col gap-3 mb-6">
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:justify-end">
                  {!embedded ? (
                  <Button
                    type="button"
                    className="gap-2 max-sm:min-h-[44px]"
                    aria-label="Rotinas"
                    asChild
                  >
                    <Link to="/Posts/categoria/eventos?tab=configuracoes">
                      <History className="w-4 h-4 shrink-0" />
                      <span className="sm:hidden text-xs font-medium">Rotinas</span>
                      <span className="hidden sm:inline">Rotinas</span>
                    </Link>
                  </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={handleNew}
                    className="gap-2 max-sm:min-h-[44px]"
                    aria-label="Novo evento"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="sm:hidden text-xs font-medium">Novo</span>
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
                clearNovoParam();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditEvento(null);
                clearNovoParam();
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

          {/* Filtros por categoria: Select no telemóvel; pills a partir de sm */}
          {!isLoading && Object.keys(contagemPorCategoria).length > 0 ? (
            <>
              <div className="mb-6 flex flex-col items-center gap-2 sm:hidden">
                <Label
                  htmlFor="eventos-categoria-mobile"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center"
                >
                  Categoria
                </Label>
                <div className="w-full max-w-md mx-auto">
                <Select
                  value={selectedCategoria ?? "all"}
                  onValueChange={(v) =>
                    setSelectedCategoria(v === "all" ? null : v)
                  }
                >
                  <SelectTrigger
                    id="eventos-categoria-mobile"
                    className="h-11 w-full text-sm"
                  >
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todas ({baseContagem.length})
                    </SelectItem>
                    {Object.entries(categoriaLabels)
                      .filter(([key]) => contagemPorCategoria[key] > 0)
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label} ({contagemPorCategoria[key]})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
              <div className="mb-6 hidden sm:flex flex-wrap items-center gap-2">
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
            </>
          ) : null}

          {/* Lista */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-muted rounded-lg animate-pulse"
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
            <div className="space-y-3">
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
                  <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
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
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:gap-3 [&>*]:min-w-0">
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
                  <div className="flex justify-center pt-8 mt-2 border-t border-border/60">
                    <div className="flex flex-wrap items-center justify-center gap-2">
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

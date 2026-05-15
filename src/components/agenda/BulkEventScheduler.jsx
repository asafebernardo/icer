import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  CalendarPlus2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  resolvePastorAvatarUrl,
  resolvePreletorAvatarUrl,
} from "@/lib/agendaPreletorAvatar";
import { buildEventoApiPayload, normalizeEventoDate } from "@/lib/eventoPayload";
import { EVENTO_CATEGORIAS } from "@/lib/eventoFormOptions";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  FieldHintMessage,
  MSG_CAMPO_OBRIGATORIO,
} from "@/components/shared/FieldHintMessage";
import {
  fetchPublicWorkspaceJson,
  mergeRemoteAgendaSugestoes,
  PUBLIC_WORKSPACE_QUERY_KEY,
} from "@/lib/publicWorkspace";
import { horarioSelectOptions } from "@/lib/horarioCadastroOptions";
import MonthlyCalendar from "@/components/agenda/MonthlyCalendar";
import { toast } from "sonner";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import { DEFAULT_AGENDA_SUGESTOES } from "@/lib/agendaSugestoesDefaults";

function randomBatchId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `bulk_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Etapas do wizard — mesmo padrão visual que `PostagemEditor` (POST_EDITOR_STEPS). */
const BULK_SCHEDULER_STEPS = [
  { key: "gerar", id: 1, title: "Datas e dados" },
  { key: "pessoas", id: 2, title: "Preletores por data" },
  { key: "revisar", id: 3, title: "Revisão" },
];

/** Ordem do primeiro erro para scroll (como `sortFieldHintKeysForScroll` em PostagemEditor). */
function sortBulkFieldHintKeysForScroll(keys) {
  const priority = [
    "titulo",
    "categoria",
    "local",
    "horario",
    "startDate",
    "endDate",
    "periodo",
    "preletorPorData",
  ];
  const rank = (k) => {
    const pi = priority.indexOf(k);
    return pi >= 0 ? pi : 800;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b));
}

/** Máximo de datas por página na etapa «Preletores por data». */
const PESSOAS_DATAS_PER_PAGE = 4;

const WEEKDAYS = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

function toDateSafe(yyyyMMdd) {
  const s = String(yyyyMMdd || "").trim();
  if (!s) return null;
  try {
    const d = parseISO(s);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function nextWeekdayOnOrAfter(d, weekday) {
  const base = new Date(d);
  const delta = (weekday - base.getDay() + 7) % 7;
  if (delta === 0) return base;
  const out = new Date(base);
  out.setDate(out.getDate() + delta);
  return out;
}

function computeWeeklyDates({ startDate, endDate, weekday, weekInterval }) {
  const start = toDateSafe(startDate);
  const end = toDateSafe(endDate);
  const wd = Number(weekday);
  const interval = Math.min(4, Math.max(1, Number(weekInterval) || 1));
  if (!start || !end) return [];
  if (Number.isNaN(wd) || wd < 0 || wd > 6) return [];
  if (isAfter(start, end)) return [];

  const first = nextWeekdayOnOrAfter(start, wd);
  const out = [];
  for (let cur = first; !isAfter(cur, end); cur = addWeeks(cur, interval)) {
    out.push(cur);
    if (out.length > 200) break; // hard guard
  }
  return out;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const DEFAULT_SUGESTOES = DEFAULT_AGENDA_SUGESTOES;

const CATEGORIA_LABEL_BY_SLUG = Object.fromEntries(
  EVENTO_CATEGORIAS.map((c) => [c.value, c.label]),
);

function ComboSugestao({
  label,
  value,
  onChange,
  sugestoes,
  required,
  formatSuggestion,
  portal = false,
  hintMessage,
  invalid,
  anchorRef,
}) {
  const [inputVal, setInputVal] = useState(value || "");
  const [showDrop, setShowDrop] = useState(false);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [portalStyle, setPortalStyle] = useState(null);
  const inputId = `bulk-${String(label).replace(/\s+/g, "-").toLowerCase()}`;

  const setRefs = useCallback(
    (node) => {
      wrapRef.current = node;
      anchorRef?.(node);
    },
    [anchorRef],
  );

  useEffect(() => {
    setInputVal(value || "");
  }, [value]);

  // Em modo portal, o menu fica fora do wrapRef; então não dá para fechar via onBlur.
  // Fechamos via clique fora (pointerdown). Usamos listener em *bubble* para não competir com seleção.
  useEffect(() => {
    if (!showDrop || !portal) return;
    const onPointerDown = (e) => {
      const t = e.target;
      if (t && t.closest) {
        if (t.closest('[data-combo-sugestao-wrap="1"]')) return;
        if (t.closest('[data-combo-sugestao-menu="1"]')) return;
      }
      setShowDrop(false);
    };
    document.addEventListener("pointerdown", onPointerDown, false);
    return () => document.removeEventListener("pointerdown", onPointerDown, false);
  }, [showDrop, portal]);

  useEffect(() => {
    if (!portal || !showDrop) {
      setPortalStyle(null);
      return;
    }
    const compute = () => {
      const el = wrapRef.current;
      if (!el) return;
      const input = el.querySelector("input");
      const anchor = input?.getBoundingClientRect?.();
      if (!anchor) return;
      setPortalStyle({
        position: "fixed",
        left: `${Math.round(anchor.left)}px`,
        top: `${Math.round(anchor.bottom + 6)}px`,
        width: `${Math.round(anchor.width)}px`,
        zIndex: 9999,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [portal, showDrop]);

  const select = (v) => {
    onChange(v);
    setInputVal(v);
    setShowDrop(false);
  };

  return (
    <div
      ref={setRefs}
      className="relative space-y-2 scroll-mt-28"
      data-combo-sugestao-wrap="1"
      onFocusCapture={() => setShowDrop(true)}
      onBlurCapture={
        portal
          ? undefined
          : (e) => {
              const next = e.relatedTarget;
              if (wrapRef.current && next && wrapRef.current.contains(next)) return;
              setShowDrop(false);
            }
      }
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
        <Label htmlFor={inputId}>
          {label}
          {required && " *"}
        </Label>
        <FieldHintMessage message={hintMessage} className="text-sm text-destructive" />
      </div>
      <div className="relative">
        <Input
          id={inputId}
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={`${label}...`}
          aria-invalid={!!invalid}
          className={cn(
            invalid &&
              "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
          )}
        />
        {showDrop && sugestoes.length > 0
          ? (() => {
              const menu = (
                <div
                  ref={menuRef}
                  data-combo-sugestao-menu="1"
                  className="bg-popover border border-border rounded-xl shadow-lg overflow-hidden pointer-events-auto"
                  style={portal && portalStyle ? portalStyle : undefined}
                >
                  <div className="max-h-48 overflow-y-auto">
                    {sugestoes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          select(s);
                        }}
                      >
                        {formatSuggestion ? formatSuggestion(s) : s}
                      </button>
                    ))}
                  </div>
                </div>
              );

              if (portal) {
                if (!portalStyle) return null;
                return createPortal(menu, document.body);
              }

              return (
                <div className="absolute z-50 top-full left-0 right-0 mt-1">
                  {menu}
                </div>
              );
            })()
          : null}
      </div>
    </div>
  );
}

/** Ex.: 1ª quarta, 2ª quarta, ..., última quarta do mês. */
function computeMonthlyNthWeekdayDates({ startDate, endDate, weekday, nth }) {
  const start = toDateSafe(startDate);
  const end = toDateSafe(endDate);
  const wd = Number(weekday);
  if (!start || !end) return [];
  if (Number.isNaN(wd) || wd < 0 || wd > 6) return [];
  if (isAfter(start, end)) return [];

  const out = [];
  let cursor = startOfMonth(start);
  const endMonth = startOfMonth(end);
  const nthKey = String(nth || "last");

  while (!isAfter(cursor, endMonth)) {
    const monthDays = eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) });
    const wdays = monthDays.filter((d) => d.getDay() === wd);
    let pick = null;
    if (nthKey === "last") {
      pick = wdays.length ? wdays[wdays.length - 1] : null;
    } else {
      const idx = clamp(Number(nthKey) - 1, 0, 4);
      pick = wdays[idx] || null;
    }
    if (pick && !isAfter(start, pick) && !isAfter(pick, end)) {
      out.push(pick);
    }
    cursor = addMonths(cursor, 1);
    if (out.length > 200) break;
  }
  return out;
}

export default function BulkEventScheduler({
  open,
  onOpenChange,
  onDone,
  existingEventos = [],
  /** Quando `inline`, o formulário é renderizado na página (sem modal). */
  variant = "dialog",
  /** Em `inline`, mostra o bloco de título; desligue quando o título vem de fora (ex.: abas). */
  showInlineHeader = true,
  /** Página do wizard: footer com Salvar / Salvar e executar; Cancelar chama `onWizardCancel`. */
  wizardPage = false,
  /** Documento GET `/api/admin/eventos/bulk-schedules/:id` — opcional para edição. */
  initialSavedSchedule = null,
  onWizardCancel,
  /** Chamado após guardar com sucesso (só guardar). */
  onWizardFinished,
}) {
  const active = variant === "inline" || open;
  const [titulo, setTitulo] = useState("Reunião de oração");
  const [categoria, setCategoria] = useState("estudo");
  const [local, setLocal] = useState("Sede local");
  const [horario, setHorario] = useState("19:45");
  const [descricao, setDescricao] = useState("");
  const [step, setStep] = useState("gerar"); // gerar | pessoas | revisar
  /** Quando falso, os campos de presbítero não aparecem na etapa «Preletores por data». */
  const [presbiteroEnabled, setPresbiteroEnabled] = useState(true);
  const [rowDefaults, setRowDefaults] = useState(() => ({
    preletor: "",
    presbitero: "",
  }));
  /** @type {Record<string, { preletor: string; presbitero: string }>} */
  const [peopleByDate, setPeopleByDate] = useState({});

  const [sugestoes, setSugestoes] = useState(() =>
    mergeRemoteAgendaSugestoes(DEFAULT_SUGESTOES, {}),
  );
  const { data: publicWs } = useQuery({
    queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
    queryFn: fetchPublicWorkspaceJson,
    enabled: active,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (publicWs == null) return;
    if (publicWs.agenda_sugestoes && typeof publicWs.agenda_sugestoes === "object") {
      setSugestoes(mergeRemoteAgendaSugestoes(DEFAULT_SUGESTOES, publicWs.agenda_sugestoes));
    }
  }, [publicWs]);

  const [repeatMode, setRepeatMode] = useState("weekly"); // weekly | monthly_nth
  const [weekday, setWeekday] = useState("3"); // quarta
  const [startDate, setStartDate] = useState(() =>
    normalizeEventoDate(new Date().toISOString()),
  );
  const [endDate, setEndDate] = useState(() => {
    const d = addMonths(new Date(), 6);
    return normalizeEventoDate(d.toISOString());
  });
  const [weekInterval, setWeekInterval] = useState("1");
  const [monthNth, setMonthNth] = useState("last"); // 1..4 | last

  const [creating, setCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [previewMode, setPreviewMode] = useState("list"); // list | calendar
  const [previewMonth, setPreviewMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [conflictError, setConflictError] = useState("");
  const [fieldHints, setFieldHints] = useState({});
  const fieldHintAnchorRefs = useRef({});
  const fieldHintTimersRef = useRef({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedTemplateId, setSavedTemplateId] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [pessoasPage, setPessoasPage] = useState(0);

  useEffect(() => {
    setSavedTemplateId(
      initialSavedSchedule?.id != null ? Number(initialSavedSchedule.id) : null,
    );
  }, [initialSavedSchedule?.id]);

  const hydratedScheduleKeyRef = useRef(null);
  useEffect(() => {
    if (!initialSavedSchedule?.payload || typeof initialSavedSchedule.payload !== "object") {
      if (initialSavedSchedule == null) hydratedScheduleKeyRef.current = null;
      return;
    }
    const key = `${initialSavedSchedule.id}:${initialSavedSchedule.updated_at ?? ""}`;
    if (hydratedScheduleKeyRef.current === key) return;
    hydratedScheduleKeyRef.current = key;
    const p = initialSavedSchedule.payload;
    if (typeof p.titulo === "string") setTitulo(p.titulo);
    if (typeof p.categoria === "string") setCategoria(p.categoria);
    if (typeof p.local === "string") setLocal(p.local);
    if (typeof p.horario === "string") setHorario(p.horario);
    if (typeof p.descricao === "string") setDescricao(p.descricao);
    if (p.repeatMode === "weekly" || p.repeatMode === "monthly_nth") setRepeatMode(p.repeatMode);
    if (typeof p.weekday === "string") setWeekday(p.weekday);
    if (typeof p.startDate === "string") setStartDate(p.startDate);
    if (typeof p.endDate === "string") setEndDate(p.endDate);
    if (typeof p.weekInterval === "string") setWeekInterval(p.weekInterval);
    if (typeof p.monthNth === "string") setMonthNth(p.monthNth);
    if (typeof p.presbiteroEnabled === "boolean") {
      setPresbiteroEnabled(p.presbiteroEnabled);
    } else {
      setPresbiteroEnabled(true);
    }
    if (p.rowDefaults && typeof p.rowDefaults === "object") {
      setRowDefaults({
        preletor: String(p.rowDefaults.preletor ?? ""),
        presbitero: String(p.rowDefaults.presbitero ?? ""),
      });
    }
    if (p.peopleByDate && typeof p.peopleByDate === "object") {
      setPeopleByDate({ ...p.peopleByDate });
    }
  }, [initialSavedSchedule]);

  const dates = useMemo(() => {
    if (repeatMode === "monthly_nth") {
      return computeMonthlyNthWeekdayDates({
        startDate,
        endDate,
        weekday,
        nth: monthNth,
      });
    }
    return computeWeeklyDates({ startDate, endDate, weekday, weekInterval });
  }, [startDate, endDate, weekday, weekInterval, repeatMode, monthNth]);

  const pessoasTotalPages = Math.max(1, Math.ceil(dates.length / PESSOAS_DATAS_PER_PAGE));

  useEffect(() => {
    setPessoasPage((p) => Math.min(p, pessoasTotalPages - 1));
  }, [pessoasTotalPages]);

  const datesPessoasPage = useMemo(() => {
    const start = pessoasPage * PESSOAS_DATAS_PER_PAGE;
    return dates.slice(start, start + PESSOAS_DATAS_PER_PAGE);
  }, [dates, pessoasPage]);

  const preview = useMemo(() => {
    const sample = dates.slice(0, 6).map((d) => format(d, "dd/MM/yyyy (EEEE)", { locale: ptBR }));
    return { total: dates.length, sample };
  }, [dates]);

  // Mantém peopleByDate sincronizado com as datas geradas, preservando edições existentes.
  useEffect(() => {
    if (!active) return;
    const next = {};
    for (const d of dates) {
      const key = normalizeEventoDate(d.toISOString());
      const cur = peopleByDate?.[key];
      next[key] = {
        preletor: String(cur?.preletor ?? rowDefaults.preletor ?? ""),
        presbitero: String(cur?.presbitero ?? rowDefaults.presbitero ?? ""),
      };
    }
    setPeopleByDate(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dates.length, dates.map((d) => normalizeEventoDate(d.toISOString())).join("|")]);

  const peopleMissingInfo = useMemo(() => {
    const keys = Object.keys(peopleByDate || {});
    if (keys.length === 0) return { missing: 0, sample: [] };
    const missingDates = [];
    for (const k of keys) {
      const p = peopleByDate[k];
      if (!String(p?.preletor || "").trim()) missingDates.push(k);
      if (missingDates.length >= 6) break;
    }
    return { missing: keys.filter((k) => !String(peopleByDate[k]?.preletor || "").trim()).length, sample: missingDates };
  }, [peopleByDate]);

  const applyDefaultToAll = (field, value) => {
    setRowDefaults((d) => ({ ...d, [field]: value }));
    setPeopleByDate((cur) => {
      const next = { ...(cur || {}) };
      for (const k of Object.keys(next)) {
        next[k] = { ...next[k], [field]: value };
      }
      return next;
    });
  };

  useEffect(() => {
    const s = toDateSafe(startDate);
    if (s) setPreviewMonth(startOfMonth(s));
  }, [startDate]);

  const previewEventos = useMemo(() => {
    return dates.map((d, idx) => ({
      id: `bulk-${normalizeEventoDate(d.toISOString())}-${idx}`,
      titulo: titulo.trim() || "Evento",
      data: normalizeEventoDate(d.toISOString()),
      categoria: categoria || "culto",
      cor_barra: "auto",
    }));
  }, [dates, titulo, categoria]);

  const conflictInfo = useMemo(() => {
    const h = String(horario || "").trim();
    const cat = String(categoria || "").trim();
    if (!h || !cat || previewEventos.length === 0) {
      return { hasConflicts: false, conflicts: [], keySet: new Set() };
    }
    const key = (dateStr) => `${dateStr}|${h}|${cat}`;

    const existingKeys = new Set();
    for (const e of Array.isArray(existingEventos) ? existingEventos : []) {
      const ed = String(e?.data || "").trim();
      const eh = String(e?.horario || "").trim();
      const ec = String(e?.categoria || "").trim();
      if (!ed || !eh || !ec) continue;
      existingKeys.add(`${normalizeEventoDate(ed)}|${eh}|${ec}`);
    }

    const conflicts = [];
    const outKeys = new Set();
    for (const ev of previewEventos) {
      const k = key(String(ev.data || ""));
      if (outKeys.has(k)) {
        conflicts.push({ data: ev.data, reason: "duplicado_na_lista" });
      } else if (existingKeys.has(k)) {
        conflicts.push({ data: ev.data, reason: "ja_existe" });
      }
      outKeys.add(k);
    }

    return { hasConflicts: conflicts.length > 0, conflicts, keySet: outKeys };
  }, [existingEventos, previewEventos, horario, categoria]);

  const horarioOpcoesBulk = useMemo(
    () => horarioSelectOptions(sugestoes.horario, horario),
    [sugestoes.horario, horario],
  );

  const setFieldHintAnchor = useCallback((key) => (el) => {
    if (el) fieldHintAnchorRefs.current[key] = el;
    else delete fieldHintAnchorRefs.current[key];
  }, []);

  const scrollFirstFieldErrorIntoView = useCallback((errKeys) => {
    const keys = sortBulkFieldHintKeysForScroll(errKeys);
    for (const key of keys) {
      const el = fieldHintAnchorRefs.current[key];
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        const focusTarget = el.matches?.(
          "input:not([type='hidden']),textarea,select",
        )
          ? el
          : el.querySelector?.(
              "input:not([type='hidden']),textarea,select",
            );
        focusTarget?.focus?.({ preventScroll: true });
        break;
      }
    }
  }, []);

  const clearFieldHint = useCallback((key) => {
    const t = fieldHintTimersRef.current[key];
    if (t) {
      clearTimeout(t);
      delete fieldHintTimersRef.current[key];
    }
    setFieldHints((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const showFieldHintsBatch = useCallback(
    (errs) => {
      const entries = Object.entries(errs);
      if (!entries.length) return;
      const errKeys = Object.keys(errs);
      setFieldHints((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      entries.forEach(([key]) => {
        if (fieldHintTimersRef.current[key]) {
          clearTimeout(fieldHintTimersRef.current[key]);
        }
        fieldHintTimersRef.current[key] = window.setTimeout(() => {
          setFieldHints((prev) => {
            const n = { ...prev };
            delete n[key];
            return n;
          });
          delete fieldHintTimersRef.current[key];
        }, 3000);
      });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollFirstFieldErrorIntoView(errKeys);
        });
      });
    },
    [scrollFirstFieldErrorIntoView],
  );

  const clearAllFieldHints = useCallback(() => {
    Object.keys(fieldHintTimersRef.current).forEach((key) => {
      clearTimeout(fieldHintTimersRef.current[key]);
      delete fieldHintTimersRef.current[key];
    });
    setFieldHints({});
  }, []);

  useEffect(() => {
    if (variant === "inline") return;
    if (!open) {
      setCreating(false);
      setCreatedCount(0);
      setStep("gerar");
      setPresbiteroEnabled(true);
      clearAllFieldHints();
      setConfirmOpen(false);
    }
  }, [open, variant, clearAllFieldHints]);

  useEffect(() => {
    if (!active) {
      setConflictError("");
      return;
    }
    if (!conflictInfo.hasConflicts) {
      setConflictError("");
      return;
    }
    const sample = conflictInfo.conflicts.slice(0, 5).map((c) => c.data).filter(Boolean);
    const msg =
      `Há conflito com eventos existentes (mesma categoria e horário) em ${conflictInfo.conflicts.length} data(s). ` +
      (sample.length ? `Ex.: ${sample.join(", ")}.` : "");
    setConflictError(msg);
  }, [active, conflictInfo]);

  const setSemesterEndFromStart = () => {
    const s = toDateSafe(startDate);
    const base = s || new Date();
    const d = addMonths(base, 6);
    setEndDate(normalizeEventoDate(d.toISOString()));
  };

  const buildSchedulePayload = () => ({
    titulo,
    categoria,
    local,
    horario,
    descricao,
    repeatMode,
    weekday,
    startDate,
    endDate,
    weekInterval,
    monthNth,
    presbiteroEnabled,
    rowDefaults: { ...rowDefaults },
    peopleByDate: { ...peopleByDate },
  });

  const persistScheduleInternal = async () => {
    const payload = buildSchedulePayload();
    const nome = String(titulo || "").trim() || "Sem nome";
    const url =
      savedTemplateId != null
        ? `/api/admin/eventos/bulk-schedules/${savedTemplateId}`
        : "/api/admin/eventos/bulk-schedules";
    const method = savedTemplateId != null ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      credentials: "include",
      headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
      body: JSON.stringify({ nome, payload }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || r.statusText);
    if (data.id != null) setSavedTemplateId(Number(data.id));
    return data;
  };

  const saveTemplateOnly = async () => {
    setSavingTemplate(true);
    try {
      await persistScheduleInternal();
      toast.success("Agendamento guardado.");
      onWizardFinished?.();
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar o agendamento.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const saveTemplateAndExecute = async () => {
    setSavingTemplate(true);
    try {
      await persistScheduleInternal();
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar o agendamento.");
      return;
    } finally {
      setSavingTemplate(false);
    }
    await createMass();
  };

  const createMass = async () => {
    setConflictError("");
    clearAllFieldHints();
    if (!titulo.trim()) {
      toast.error("Informe o título do evento.");
      return;
    }
    if (!String(categoria || "").trim()) {
      toast.error("Informe a categoria do evento.");
      return;
    }
    if (conflictInfo.hasConflicts) {
      toast.error(
        "Não foi possível criar: há eventos já cadastrados no mesmo horário e categoria para algumas datas. Ajuste o período/horário/categoria.",
      );
      return;
    }
    if (!dates.length) {
      toast.error("Defina um período válido para gerar pelo menos 1 data.");
      return;
    }
    if (step !== "revisar") {
      toast.error("Finalize a revisão antes de criar.");
      return;
    }
    if (peopleMissingInfo.missing > 0) {
      const sample = peopleMissingInfo.sample?.length ? ` Ex.: ${peopleMissingInfo.sample.join(", ")}.` : "";
      toast.error(`Preletor obrigatório: faltando em ${peopleMissingInfo.missing} data(s).${sample}`);
      return;
    }
    setCreating(true);
    setCreatedCount(0);
    const batchId = randomBatchId();
    /** @type {number[]} */
    const createdIds = [];
    try {
      for (let i = 0; i < dates.length; i += 1) {
        const d = dates[i];
        const dateKey = normalizeEventoDate(d.toISOString());
        const people = peopleByDate?.[dateKey] || {};
        const presbNome = presbiteroEnabled ? String(people.presbitero || "").trim() : "";
        const payload = buildEventoApiPayload({
          titulo: titulo.trim(),
          categoria,
          cor_barra: "auto",
          local: local.trim(),
          horario: String(horario || "").trim(),
          data: normalizeEventoDate(d.toISOString()),
          descricao: descricao.trim(),
          preletor: String(people.preletor || "").trim(),
          pastor: presbNome,
          preletor_avatar_url: resolvePreletorAvatarUrl(
            sugestoes.preletor_avatars,
            people.preletor,
          ),
          pastor_avatar_url: presbiteroEnabled
            ? resolvePastorAvatarUrl(sugestoes.pastor_avatars, people.presbitero)
            : "",
        });
        // eslint-disable-next-line no-await-in-loop
        const created = await api.entities.Evento.create({
          ...payload,
          bulk_batch_id: batchId,
        });
        if (created?.id != null) createdIds.push(Number(created.id));
        setCreatedCount(i + 1);
      }
      try {
        await fetch("/api/admin/eventos/bulk-runs", {
          method: "POST",
          credentials: "include",
          headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            batch_id: batchId,
            titulo: titulo.trim(),
            categoria,
            range_start: startDate,
            range_end: endDate,
            created_event_ids: createdIds,
          }),
        });
      } catch {
        // Se falhar o registro da rotina, não bloqueia a criação dos eventos.
      }
      toast.success(`Criados ${dates.length} eventos.`);
      onDone?.();
      if (wizardPage) {
        onWizardFinished?.();
      }
      if (variant !== "inline" && !wizardPage) {
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e?.message || "Erro ao criar eventos em massa.");
    } finally {
      setCreating(false);
    }
  };

  const validateCurrentStep = () => {
    /** @type {Record<string, string>} */
    const errs = {};

    if (step === "gerar") {
      if (!String(titulo || "").trim()) errs.titulo = MSG_CAMPO_OBRIGATORIO;
      if (!String(categoria || "").trim()) errs.categoria = MSG_CAMPO_OBRIGATORIO;
      if (!String(local || "").trim()) errs.local = MSG_CAMPO_OBRIGATORIO;
      if (!String(horario || "").trim()) errs.horario = MSG_CAMPO_OBRIGATORIO;
      if (!String(startDate || "").trim()) errs.startDate = MSG_CAMPO_OBRIGATORIO;
      if (!String(endDate || "").trim()) errs.endDate = MSG_CAMPO_OBRIGATORIO;
      if (String(startDate || "").trim() && String(endDate || "").trim() && dates.length === 0) {
        errs.periodo =
          "O período não gera nenhuma data. Ajuste dia da semana, intervalo ou datas.";
      }
    } else if (step === "pessoas") {
      if (peopleMissingInfo.missing > 0) {
        errs.preletorPorData = `Preletor obrigatório: faltando em ${peopleMissingInfo.missing} data(s).`;
      }
    }

    if (Object.keys(errs).length) {
      showFieldHintsBatch(errs);
      return false;
    }
    return true;
  };

  const formInner = (
          <div className="grid gap-6">
          <nav aria-label="Etapas do formulário" className="mb-2">
            <ol className="m-0 flex list-none flex-col gap-0 p-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-3">
              {BULK_SCHEDULER_STEPS.map(({ key: stepKey, id: sid, title }, idx) => (
                <Fragment key={stepKey}>
                  {idx > 0 ? (
                    <li
                      aria-hidden="true"
                      className="flex shrink-0 justify-center py-1.5 sm:flex sm:items-center sm:self-stretch sm:px-0.5 sm:py-0"
                    >
                      <ChevronDown className="h-5 w-5 text-muted-foreground/70 sm:hidden" />
                      <ChevronRight className="hidden h-5 w-5 shrink-0 text-muted-foreground/70 sm:block" />
                    </li>
                  ) : null}
                  <li
                    className={cn(
                      "flex min-h-[3rem] min-w-0 flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors sm:min-w-[7.5rem]",
                      step === stepKey
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border bg-muted/20 text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        step === stepKey
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                      aria-current={step === stepKey ? "step" : undefined}
                    >
                      {sid}
                    </span>
                    <span className="min-w-0 font-medium leading-snug">{title}</span>
                  </li>
                </Fragment>
              ))}
            </ol>
          </nav>

          {step === "gerar" ? (
            <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
            <ComboSugestao
              label="Título"
              value={titulo}
              onChange={(v) => {
                setTitulo(v);
                clearFieldHint("titulo");
              }}
              sugestoes={sugestoes.titulo || []}
              required
              hintMessage={fieldHints.titulo}
              invalid={!!fieldHints.titulo}
              anchorRef={setFieldHintAnchor("titulo")}
            />
            </div>
            <ComboSugestao
              label="Categoria"
              required
              value={categoria}
              onChange={(v) => {
                setCategoria(v);
                clearFieldHint("categoria");
              }}
              sugestoes={sugestoes.categoria || []}
              formatSuggestion={(slug) => CATEGORIA_LABEL_BY_SLUG[slug] || slug}
              hintMessage={fieldHints.categoria}
              invalid={!!fieldHints.categoria}
              anchorRef={setFieldHintAnchor("categoria")}
            />
            <ComboSugestao
              label="Local"
              required
              value={local}
              onChange={(v) => {
                setLocal(v);
                clearFieldHint("local");
              }}
              sugestoes={sugestoes.local || []}
              hintMessage={fieldHints.local}
              invalid={!!fieldHints.local}
              anchorRef={setFieldHintAnchor("local")}
            />
            <div
              ref={setFieldHintAnchor("horario")}
              className="space-y-2 scroll-mt-28"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
                <Label htmlFor="bulk-horario">Horário *</Label>
                <FieldHintMessage
                  message={fieldHints.horario}
                  className="text-sm text-destructive"
                />
              </div>
              <Select
                value={horario || undefined}
                onValueChange={(v) => {
                  setHorario(v);
                  clearFieldHint("horario");
                }}
              >
                <SelectTrigger
                  id="bulk-horario"
                  aria-invalid={!!fieldHints.horario}
                  className={cn(
                    "w-full",
                    fieldHints.horario &&
                      "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
                  )}
                >
                  <SelectValue placeholder="Selecione o horário (cadastro)" />
                </SelectTrigger>
                <SelectContent>
                  {horarioOpcoesBulk.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/25 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="bulk-presbitero-enabled" className="text-base">
                  Presbítero por data
                </Label>
                <p className="text-xs text-muted-foreground leading-snug">
                  Ligado: na etapa seguinte aparecem campos de presbítero (padrão e por cada data). Desligado: apenas
                  preletor.
                </p>
              </div>
              <Switch
                id="bulk-presbitero-enabled"
                checked={presbiteroEnabled}
                onCheckedChange={setPresbiteroEnabled}
                aria-label="Incluir presbítero na etapa seguinte"
              />
            </div>
            <div className="space-y-2">
              <Label>Repetição</Label>
              <Select
                value={repeatMode}
                onValueChange={(v) => {
                  setRepeatMode(v);
                  clearFieldHint("periodo");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal (toda semana)</SelectItem>
                  <SelectItem value="monthly_nth">Mensal (ex.: 1ª/última do mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <Select
                value={weekday}
                onValueChange={(v) => {
                  setWeekday(v);
                  clearFieldHint("periodo");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {repeatMode === "weekly" ? (
              <div className="space-y-2">
                <Label>Intervalo semanal</Label>
                <Select
                  value={weekInterval}
                  onValueChange={(v) => {
                    setWeekInterval(v);
                    clearFieldHint("periodo");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Toda semana</SelectItem>
                    <SelectItem value="2">A cada 2 semanas</SelectItem>
                    <SelectItem value="3">A cada 3 semanas</SelectItem>
                    <SelectItem value="4">A cada 4 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Ocorrência no mês</Label>
                <Select
                  value={monthNth}
                  onValueChange={(v) => {
                    setMonthNth(v);
                    clearFieldHint("periodo");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1ª do mês</SelectItem>
                    <SelectItem value="2">2ª do mês</SelectItem>
                    <SelectItem value="3">3ª do mês</SelectItem>
                    <SelectItem value="4">4ª do mês</SelectItem>
                    <SelectItem value="last">Última do mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div ref={setFieldHintAnchor("startDate")} className="space-y-2 scroll-mt-28">
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
                <Label htmlFor="bulk-start-date">Data inicial *</Label>
                <FieldHintMessage message={fieldHints.startDate} className="text-sm text-destructive" />
              </div>
              <Input
                id="bulk-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  clearFieldHint("startDate");
                  clearFieldHint("periodo");
                }}
                aria-invalid={!!fieldHints.startDate}
                className={cn(
                  fieldHints.startDate &&
                    "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
                )}
              />
            </div>
            <div ref={setFieldHintAnchor("endDate")} className="space-y-2 scroll-mt-28">
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
                <Label htmlFor="bulk-end-date">Data final *</Label>
                <FieldHintMessage message={fieldHints.endDate} className="text-sm text-destructive" />
              </div>
              <Input
                id="bulk-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  clearFieldHint("endDate");
                  clearFieldHint("periodo");
                }}
                aria-invalid={!!fieldHints.endDate}
                className={cn(
                  fieldHints.endDate &&
                    "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
                )}
              />
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSemesterEndFromStart();
                    clearFieldHint("endDate");
                    clearFieldHint("periodo");
                  }}
                >
                  Semestre
                </Button>
              </div>
            </div>
          </div>
          <div ref={setFieldHintAnchor("periodo")} className="scroll-mt-28">
            <FieldHintMessage message={fieldHints.periodo} className="text-sm text-destructive block" />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
            </>
          ) : step === "pessoas" ? (
            <>
              <div
                ref={setFieldHintAnchor("preletorPorData")}
                className="rounded-xl border border-border bg-muted/30 p-4 scroll-mt-28"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {presbiteroEnabled
                        ? "Defina quem será o preletor e o presbítero em cada data"
                        : "Defina quem será o preletor em cada data"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      O preletor é obrigatório em todas as datas.
                      {presbiteroEnabled
                        ? " Pode aplicar padrões e ajustar caso a caso."
                        : " Ative «Presbítero por data» na etapa anterior para incluir presbítero."}
                    </p>
                  </div>
                  <FieldHintMessage
                    message={fieldHints.preletorPorData}
                    className="text-sm text-destructive shrink-0 sm:max-w-[min(100%,20rem)] sm:text-right"
                  />
                </div>

                <div
                  className={cn(
                    "mt-4 grid gap-4",
                    presbiteroEnabled ? "sm:grid-cols-2" : "grid-cols-1 max-w-xl",
                  )}
                >
                  <ComboSugestao
                    label="Preletor (padrão)"
                    value={rowDefaults.preletor}
                    onChange={(v) => {
                      applyDefaultToAll("preletor", v);
                      clearFieldHint("preletorPorData");
                    }}
                    sugestoes={sugestoes.preletor || []}
                    required
                    portal
                  />
                  {presbiteroEnabled ? (
                    <ComboSugestao
                      label="Presbítero (padrão)"
                      value={rowDefaults.presbitero}
                      onChange={(v) => applyDefaultToAll("presbitero", v)}
                      sugestoes={sugestoes.pastor || []}
                      portal
                    />
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    Datas ({preview.total})
                  </p>
                  {peopleMissingInfo.missing > 0 ? (
                    <p className="text-xs text-destructive">
                      Faltando preletor em {peopleMissingInfo.missing} data(s)
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tudo pronto.</p>
                  )}
                </div>
                {dates.length > PESSOAS_DATAS_PER_PAGE ? (
                  <div className="border-b border-border bg-muted/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={pessoasPage <= 0}
                      onClick={() => setPessoasPage((p) => Math.max(0, p - 1))}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4 shrink-0" />
                      Anterior
                    </Button>
                    <p className="text-xs font-medium text-muted-foreground tabular-nums order-first basis-full text-center sm:order-none sm:basis-auto">
                      Página {pessoasPage + 1} de {pessoasTotalPages}
                      <span className="text-muted-foreground/80 font-normal">
                        {" "}
                        ·{" "}
                        {dates.length > 0
                          ? `${pessoasPage * PESSOAS_DATAS_PER_PAGE + 1}–${Math.min(
                              (pessoasPage + 1) * PESSOAS_DATAS_PER_PAGE,
                              dates.length,
                            )} de ${dates.length}`
                          : ""}
                      </span>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={pessoasPage >= pessoasTotalPages - 1}
                      onClick={() =>
                        setPessoasPage((p) => Math.min(pessoasTotalPages - 1, p + 1))
                      }
                      aria-label="Página seguinte"
                    >
                      Seguinte
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </Button>
                  </div>
                ) : null}
                <div className="p-4 space-y-3">
                  {datesPessoasPage.map((d) => {
                    const key = normalizeEventoDate(d.toISOString());
                    const p = peopleByDate?.[key] || {};
                    const missing = !String(p.preletor || "").trim();
                    return (
                      <div
                        key={key}
                        className={cn(
                          "rounded-xl border p-3",
                          missing ? "border-destructive/40 bg-destructive/5" : "border-border bg-background",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">
                            {format(parseISO(key), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                          </p>
                          {missing ? (
                            <span className="text-xs font-medium text-destructive">
                              Preletor obrigatório
                            </span>
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            "mt-3 grid gap-3",
                            presbiteroEnabled ? "sm:grid-cols-2" : "grid-cols-1",
                          )}
                        >
                          <ComboSugestao
                            label="Preletor"
                            value={p.preletor}
                            onChange={(v) => {
                              setPeopleByDate((cur) => ({
                                ...(cur || {}),
                                [key]: { ...(cur?.[key] || {}), preletor: v },
                              }));
                              clearFieldHint("preletorPorData");
                            }}
                            sugestoes={sugestoes.preletor || []}
                            required
                            portal
                          />
                          {presbiteroEnabled ? (
                            <ComboSugestao
                              label="Presbítero"
                              value={p.presbitero}
                              onChange={(v) =>
                                setPeopleByDate((cur) => ({
                                  ...(cur || {}),
                                  [key]: { ...(cur?.[key] || {}), presbitero: v },
                                }))
                              }
                              sugestoes={sugestoes.pastor || []}
                              portal
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
            {(conflictInfo.hasConflicts ||
              peopleMissingInfo.missing > 0 ||
              preview.total === 0) && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/[0.06] dark:bg-destructive/10 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Erros e conflitos</h3>
                <div className="space-y-2 text-sm text-destructive">
                  {preview.total === 0 ? (
                    <p>Nenhuma data no período. Ajuste repetição, dia da semana ou intervalo de datas na primeira etapa.</p>
                  ) : null}
                  {conflictInfo.hasConflicts ? (
                    <p>{conflictError || "Há conflitos com eventos já existentes (mesma categoria e horário). Ajuste na primeira etapa."}</p>
                  ) : null}
                  {peopleMissingInfo.missing > 0 ? (
                    <p>
                      Preletor obrigatório em todas as datas: faltam{" "}
                      {peopleMissingInfo.missing} data(s). Volte à etapa anterior para completar.
                    </p>
                  ) : null}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">
                Revisão: {preview.total} evento(s)
                {creating ? ` • Criando: ${createdCount}/${preview.total}` : ""}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex bg-background/60 rounded-lg p-1 gap-1 border border-border/70">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("list")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                      previewMode === "list"
                        ? "bg-background shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ListChecks className="w-3.5 h-3.5" /> Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("calendar")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                      previewMode === "calendar"
                        ? "bg-background shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Calendário
                  </button>
                </div>
                {previewMode === "calendar" ? (
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPreviewMonth((m) => addMonths(m, -1))}
                      aria-label="Mês anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-semibold text-foreground capitalize">
                      {format(previewMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPreviewMonth((m) => addMonths(m, 1))}
                      aria-label="Mês seguinte"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                ) : null}
              </div>

              {previewMode === "list" ? (
                preview.sample.length ? (
                  <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                    {preview.sample.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                    {preview.total > preview.sample.length ? <li>…</li> : null}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Defina um período para ver as datas.
                  </p>
                )
              ) : (
                <div className="mt-3">
                  <MonthlyCalendar
                    monthDate={previewMonth}
                    eventos={previewEventos}
                    onEventClick={() => {}}
                    onDayClick={() => {}}
                    tituloCorBarraMap={sugestoes.titulo_cor_barra || {}}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Prévia: os cards acima serão criados ao confirmar.
                  </p>
                </div>
              )}
            </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (wizardPage && onWizardCancel) {
                  onWizardCancel();
                  return;
                }
                onOpenChange(false);
              }}
              disabled={creating || savingTemplate}
            >
              Cancelar
            </Button>
            {step !== "gerar" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => (s === "revisar" ? "pessoas" : "gerar"))}
                disabled={creating || savingTemplate}
              >
                Voltar
              </Button>
            ) : null}
            <div className="flex flex-col items-end gap-1">
              {step === "revisar" && wizardPage ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void saveTemplateOnly()}
                    disabled={
                      creating ||
                      savingTemplate ||
                      !preview.total ||
                      conflictInfo.hasConflicts ||
                      peopleMissingInfo.missing > 0
                    }
                    className="gap-2"
                  >
                    {savingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void saveTemplateAndExecute()}
                    disabled={
                      creating ||
                      savingTemplate ||
                      !preview.total ||
                      conflictInfo.hasConflicts ||
                      peopleMissingInfo.missing > 0
                    }
                    className="gap-2"
                  >
                    {creating || savingTemplate ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : null}
                    Salvar e executar
                  </Button>
                </div>
              ) : step === "revisar" ? (
                <Button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={creating || !preview.total || conflictInfo.hasConflicts}
                  className="gap-2"
                >
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Criar em massa
                </Button>
              ) : (
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => {
                    const ok = validateCurrentStep();
                    if (!ok) return;
                    clearAllFieldHints();
                    if (step === "gerar") {
                      setStep("pessoas");
                      return;
                    }
                    setStep("revisar");
                  }}
                  disabled={creating || savingTemplate}
                >
                  Próximo
                </Button>
              )}
            </div>
          </div>
          </div>
  );

  const titleBlock =
    variant === "inline" ? (
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <CalendarPlus2 className="w-5 h-5 shrink-0 text-accent" />
          Agendar em massa
          <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            Beta
          </span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Gere várias datas de uma vez e confira antes de criar na agenda.
        </p>
      </div>
    ) : (
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarPlus2 className="w-5 h-5 text-accent" />
          Agendar em massa
        </DialogTitle>
      </DialogHeader>
    );

  return (
    <>
      {variant === "inline" ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {showInlineHeader !== false ? titleBlock : null}
          <div className="max-h-none overflow-visible">{formInner}</div>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {titleBlock}
            {formInner}
          </DialogContent>
        </Dialog>
      )}

      {!wizardPage ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={(v) => {
            if (creating) return;
            setConfirmOpen(v);
          }}
          title="Criar eventos em massa?"
          description={`Isto irá criar ${preview.total} evento(s) com as configurações definidas. Deseja continuar?`}
          confirmLabel={creating ? "Criando..." : "Criar agora"}
          cancelLabel="Voltar"
          confirmVariant="default"
          onConfirm={() => {
            if (creating) return;
            void createMass();
          }}
        />
      ) : null}
    </>
  );
}


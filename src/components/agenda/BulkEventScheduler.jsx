import { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildEventoApiPayload, normalizeEventoDate } from "@/lib/eventoPayload";
import { EVENTO_CATEGORIAS } from "@/lib/eventoFormOptions";
import { EVENT_CARD_COLOR_OPTIONS } from "@/lib/eventCardColors";
import { cn } from "@/lib/utils";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  fetchPublicWorkspaceJson,
  mergeRemoteAgendaSugestoes,
  PUBLIC_WORKSPACE_QUERY_KEY,
  putAgendaSugestoesRemote,
} from "@/lib/publicWorkspace";
import MonthlyCalendar from "@/components/agenda/MonthlyCalendar";
import { toast } from "sonner";

function randomBatchId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `bulk_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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

const LOCAIS_PADRAO = ["Sede local", "Outros"];
const SUGESTOES_KEY = "agenda_sugestoes";

const DEFAULT_SUGESTOES = {
  titulo: [
    "Ceia + EBD",
    "Estudo bíblico",
    "Reunião feminina",
    "Reunião masculina",
    "Reunião de jovens",
    "Reunião de oração",
    "Cronológico",
    "Aconselhamento",
    "Assembléia",
  ],
  preletor: ["Asafe", "Joneri", "Juninho"],
  pastor: ["Joneri", "Sandro"],
  categoria: EVENTO_CATEGORIAS.map((c) => c.value),
};

const CATEGORIA_LABEL_BY_SLUG = Object.fromEntries(
  EVENTO_CATEGORIAS.map((c) => [c.value, c.label]),
);

function loadSugestoesLocal() {
  try {
    const raw = localStorage.getItem(SUGESTOES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = { ...DEFAULT_SUGESTOES, ...parsed };
    for (const key of Object.keys(DEFAULT_SUGESTOES)) {
      if (!Array.isArray(merged[key]) || merged[key].length === 0) {
        merged[key] = DEFAULT_SUGESTOES[key];
      }
    }
    return merged;
  } catch {
    return { ...DEFAULT_SUGESTOES };
  }
}

function saveSugestoesLocal(s) {
  try {
    localStorage.setItem(SUGESTOES_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function ComboSugestao({
  label,
  value,
  onChange,
  sugestoes,
  onSugestoesChange,
  required,
  formatSuggestion,
  portal = false,
}) {
  const [inputVal, setInputVal] = useState(value || "");
  const [showDrop, setShowDrop] = useState(false);
  const [newItem, setNewItem] = useState("");
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [portalStyle, setPortalStyle] = useState(null);

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

  const addSugestao = () => {
    const t = newItem.trim();
    if (t && !sugestoes.includes(t)) {
      const updated = [...sugestoes, t];
      onSugestoesChange(updated);
    }
    setNewItem("");
  };

  const removeSugestao = (item) => {
    onSugestoesChange(sugestoes.filter((s) => s !== item));
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
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
      <Label>
        {label}
        {required && " *"}
      </Label>
      <div className="relative mt-1">
        <Input
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={`${label}...`}
        />
        {showDrop
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
                      <div
                        key={s}
                        className="flex items-center justify-between px-3 py-2 hover:bg-muted group"
                      >
                        <button
                          type="button"
                          className="flex-1 text-left text-sm text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            select(s);
                          }}
                        >
                          {formatSuggestion ? formatSuggestion(s) : s}
                        </button>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            removeSugestao(s);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border p-2 flex gap-2">
                    <Input
                      className="h-7 text-xs"
                      placeholder="Adicionar opção..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addSugestao())
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        addSugestao();
                      }}
                    >
                      +
                    </Button>
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

function LocalField({ value, onChange }) {
  const [modo, setModo] = useState(value && !LOCAIS_PADRAO.includes(value) ? "livre" : "select");
  const [localLivre, setLocalLivre] = useState(
    value && !LOCAIS_PADRAO.includes(value) ? value : "",
  );

  useEffect(() => {
    if (value && !LOCAIS_PADRAO.includes(value)) {
      setModo("livre");
      setLocalLivre(value);
    } else {
      setModo("select");
    }
  }, [value]);

  const handleSelect = (v) => {
    if (v === "__livre__") {
      setModo("livre");
      onChange(localLivre);
    } else {
      setModo("select");
      onChange(v);
    }
  };

  return (
    <div>
      <Label>Local *</Label>
      {modo === "select" ? (
        <Select value={value || ""} onValueChange={handleSelect}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selecionar local..." />
          </SelectTrigger>
          <SelectContent>
            {LOCAIS_PADRAO.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
            <SelectItem value="__livre__">✏️ Digitar endereço...</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2 mt-1">
          <Input
            value={localLivre}
            onChange={(e) => {
              setLocalLivre(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="Digite o local..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setModo("select");
              onChange("Sede local");
            }}
          >
            Voltar
          </Button>
        </div>
      )}
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
}) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("Reunião de oração");
  const [categoria, setCategoria] = useState("estudo");
  const [corBarra, setCorBarra] = useState("auto");
  const [local, setLocal] = useState("Sede local");
  const [horario, setHorario] = useState("19:45");
  const [descricao, setDescricao] = useState("");
  const [step, setStep] = useState("gerar"); // gerar | pessoas | revisar
  const [rowDefaults, setRowDefaults] = useState(() => ({
    preletor: "",
    presbitero: "",
  }));
  /** @type {Record<string, { preletor: string; presbitero: string }>} */
  const [peopleByDate, setPeopleByDate] = useState({});

  const useRemoteWs = isServerAuthEnabled();
  const [sugestoes, setSugestoes] = useState(loadSugestoesLocal);
  const { data: publicWs } = useQuery({
    queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
    queryFn: fetchPublicWorkspaceJson,
    enabled: useRemoteWs,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!useRemoteWs || publicWs == null) return;
    if (publicWs.agenda_sugestoes && typeof publicWs.agenda_sugestoes === "object") {
      setSugestoes(mergeRemoteAgendaSugestoes(DEFAULT_SUGESTOES, publicWs.agenda_sugestoes));
    }
  }, [useRemoteWs, publicWs]);

  const updateSugestoes = (campo, lista) => {
    const updated = { ...sugestoes, [campo]: lista };
    setSugestoes(updated);
    if (useRemoteWs) {
      void (async () => {
        try {
          await putAgendaSugestoesRemote(updated);
          await queryClient.invalidateQueries({ queryKey: PUBLIC_WORKSPACE_QUERY_KEY });
        } catch (e) {
          toast.error(e?.message || "Não foi possível guardar sugestões.");
        }
      })();
    } else {
      saveSugestoesLocal(updated);
    }
  };

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setCreatedCount(0);
      setStep("gerar");
      setFieldErrors({});
      setConfirmOpen(false);
    }
  }, [open]);

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

  const preview = useMemo(() => {
    const sample = dates.slice(0, 6).map((d) => format(d, "dd/MM/yyyy (EEEE)", { locale: ptBR }));
    return { total: dates.length, sample };
  }, [dates]);

  // Mantém peopleByDate sincronizado com as datas geradas, preservando edições existentes.
  useEffect(() => {
    if (!open) return;
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
  }, [open, dates.length, dates.map((d) => normalizeEventoDate(d.toISOString())).join("|")]);

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
      cor_barra: corBarra || "auto",
    }));
  }, [dates, titulo, categoria, corBarra]);

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

  useEffect(() => {
    if (!open) {
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
  }, [open, conflictInfo]);

  const setSemesterEndFromStart = () => {
    const s = toDateSafe(startDate);
    const base = s || new Date();
    const d = addMonths(base, 6);
    setEndDate(normalizeEventoDate(d.toISOString()));
  };

  const createMass = async () => {
    setConflictError("");
    setFieldErrors({});
    if (!titulo.trim()) {
      toast.error("Informe o título do evento.");
      return;
    }
    if (!String(categoria || "").trim()) {
      toast.error("Informe a categoria do evento.");
      return;
    }
    if (conflictInfo.hasConflicts) {
      setConflictError(
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
      setConflictError(`Preletor obrigatório: faltando em ${peopleMissingInfo.missing} data(s).${sample}`);
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
        const payload = buildEventoApiPayload({
          titulo: titulo.trim(),
          categoria,
          cor_barra: corBarra || "auto",
          local: local.trim(),
          horario: String(horario || "").trim(),
          data: normalizeEventoDate(d.toISOString()),
          descricao: descricao.trim(),
          preletor: String(people.preletor || "").trim(),
          pastor: String(people.presbitero || "").trim(), // campo da API continua `pastor`
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
          headers: { "Content-Type": "application/json" },
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
      onOpenChange(false);
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
      if (!String(titulo || "").trim()) errs.titulo = "Preencha o título.";
      if (!String(categoria || "").trim()) errs.categoria = "Preencha a categoria.";
      if (!String(local || "").trim()) errs.local = "Preencha o local.";
      if (!String(horario || "").trim()) errs.horario = "Preencha o horário.";
      if (!String(startDate || "").trim()) errs.startDate = "Preencha a data inicial.";
      if (!String(endDate || "").trim()) errs.endDate = "Preencha a data final.";
      if (String(startDate || "").trim() && String(endDate || "").trim() && dates.length === 0) {
        errs.periodo = "O período não gera nenhuma data. Ajuste dia/intervalo/período.";
      }
      if (conflictInfo.hasConflicts) {
        errs.conflicts =
          "Há conflitos (mesma categoria e horário) com eventos existentes. Ajuste antes de avançar.";
      }
    } else if (step === "pessoas") {
      if (peopleMissingInfo.missing > 0) {
        errs.preletorPorData = `Preletor obrigatório: faltando em ${peopleMissingInfo.missing} data(s).`;
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus2 className="w-5 h-5 text-accent" />
              Agendar em massa
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6">
          {/* Etapas */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-md border",
                  step === "gerar"
                    ? "bg-background text-foreground border-border"
                    : "bg-muted/40 text-muted-foreground border-border/60",
                )}
              >
                1) Datas e dados
              </span>
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-md border",
                  step === "pessoas"
                    ? "bg-background text-foreground border-border"
                    : "bg-muted/40 text-muted-foreground border-border/60",
                )}
              >
                2) Preletores por data
              </span>
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-md border",
                  step === "revisar"
                    ? "bg-background text-foreground border-border"
                    : "bg-muted/40 text-muted-foreground border-border/60",
                )}
              >
                3) Revisão
              </span>
            </div>
          </div>

          {step === "gerar" ? (
            <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <ComboSugestao
                label="Título"
                value={titulo}
                onChange={setTitulo}
                sugestoes={sugestoes.titulo || []}
                onSugestoesChange={(lista) => updateSugestoes("titulo", lista)}
                required
              />
              {fieldErrors.titulo ? (
                <p className="text-xs text-destructive mt-1">{fieldErrors.titulo}</p>
              ) : null}
            </div>
            <ComboSugestao
              label="Categoria"
              required
              value={categoria}
              onChange={setCategoria}
              sugestoes={sugestoes.categoria || []}
              onSugestoesChange={(lista) => updateSugestoes("categoria", lista)}
              formatSuggestion={(slug) => CATEGORIA_LABEL_BY_SLUG[slug] || slug}
            />
            {fieldErrors.categoria ? (
              <p className="text-xs text-destructive -mt-2">{fieldErrors.categoria}</p>
            ) : null}
            <LocalField value={local} onChange={setLocal} />
            {fieldErrors.local ? (
              <p className="text-xs text-destructive -mt-2">{fieldErrors.local}</p>
            ) : null}
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
              {fieldErrors.horario ? (
                <p className="text-xs text-destructive mt-1">{fieldErrors.horario}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Repetição</Label>
              <Select value={repeatMode} onValueChange={setRepeatMode}>
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
              <Select value={weekday} onValueChange={setWeekday}>
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
                <Select value={weekInterval} onValueChange={setWeekInterval}>
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
                <Select value={monthNth} onValueChange={setMonthNth}>
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
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {fieldErrors.startDate ? (
                <p className="text-xs text-destructive mt-1">{fieldErrors.startDate}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Data final</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              {fieldErrors.endDate ? (
                <p className="text-xs text-destructive mt-1">{fieldErrors.endDate}</p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={setSemesterEndFromStart}>
                  Semestre
                </Button>
              </div>
            </div>
          </div>
          {fieldErrors.periodo ? (
            <p className="text-xs text-destructive">{fieldErrors.periodo}</p>
          ) : null}
          {fieldErrors.conflicts ? (
            <p className="text-xs text-destructive">{fieldErrors.conflicts}</p>
          ) : null}

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div>
            <Label>Cor do card (barra)</Label>
            <div className="mt-2 flex flex-wrap gap-2 items-center" role="group" aria-label="Cor do card">
              <button
                type="button"
                title="Igual à categoria"
                aria-label="Igual à categoria"
                aria-pressed={(corBarra || "auto") === "auto"}
                onClick={() => setCorBarra("auto")}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                  (corBarra || "auto") === "auto"
                    ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                    : "border-dashed border-muted-foreground/60 bg-muted/50 hover:bg-muted",
                )}
              >
                <span className="text-[10px] font-bold text-muted-foreground">A</span>
              </button>
              {EVENT_CARD_COLOR_OPTIONS.filter((o) => o.tailwind).map((o) => {
                const selected = corBarra === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    title={o.label}
                    aria-label={o.label}
                    aria-pressed={selected}
                    onClick={() => setCorBarra(o.value)}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-all shrink-0 flex items-center justify-center",
                      selected
                        ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                        : "border-transparent hover:border-muted-foreground/40",
                    )}
                  >
                    <span className={cn("h-6 w-6 rounded-full", o.tailwind)} />
                  </button>
                );
              })}
            </div>
          </div>
            </>
          ) : step === "pessoas" ? (
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Defina quem será o preletor/presbítero em cada data
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  O preletor é obrigatório em todas as datas. Você pode aplicar um padrão para todas e ajustar caso a caso.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <ComboSugestao
                    label="Preletor (padrão)"
                    value={rowDefaults.preletor}
                    onChange={(v) => applyDefaultToAll("preletor", v)}
                    sugestoes={sugestoes.preletor || []}
                    onSugestoesChange={(lista) => updateSugestoes("preletor", lista)}
                    required
                    portal
                  />
                  <ComboSugestao
                    label="Presbítero (padrão)"
                    value={rowDefaults.presbitero}
                    onChange={(v) => applyDefaultToAll("presbitero", v)}
                    sugestoes={sugestoes.pastor || []}
                    onSugestoesChange={(lista) => updateSugestoes("pastor", lista)}
                    portal
                  />
                </div>
                {fieldErrors.preletorPorData ? (
                  <p className="mt-3 text-xs text-destructive">{fieldErrors.preletorPorData}</p>
                ) : null}
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
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
                <div className="max-h-[45vh] overflow-y-auto p-4 space-y-3">
                  {dates.map((d) => {
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
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <ComboSugestao
                            label="Preletor"
                            value={p.preletor}
                            onChange={(v) =>
                              setPeopleByDate((cur) => ({
                                ...(cur || {}),
                                [key]: { ...(cur?.[key] || {}), preletor: v },
                              }))
                            }
                            sugestoes={sugestoes.preletor || []}
                            onSugestoesChange={(lista) => updateSugestoes("preletor", lista)}
                            required
                            portal
                          />
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
                            onSugestoesChange={(lista) => updateSugestoes("pastor", lista)}
                            portal
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
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
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Prévia: os cards acima serão criados ao confirmar.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={creating}>
              Cancelar
            </Button>
            {step !== "gerar" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => (s === "revisar" ? "pessoas" : "gerar"))}
                disabled={creating}
              >
                Voltar
              </Button>
            ) : null}
            <div className="flex flex-col items-end gap-1">
              {step === "revisar" ? (
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
                    if (step === "gerar") {
                      setStep("pessoas");
                      return;
                    }
                    setStep("revisar");
                  }}
                  disabled={creating}
                >
                  Próximo
                </Button>
              )}
              {conflictError ? (
                <p className="text-xs text-destructive max-w-[34rem] text-right">
                  {conflictError}
                </p>
              ) : null}
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
}


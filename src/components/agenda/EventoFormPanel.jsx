import { useState, useEffect, useMemo, useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, ImagePlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { eventCardBarClass } from "@/lib/eventCardColors";
import { CATEGORY_BAR_CLASS } from "@/lib/categoryAppearance";
import { EVENTO_CATEGORIAS } from "@/lib/eventoFormOptions";
import {
  HORARIO_FIM_VAZIO,
  horarioSelectOptions,
} from "@/lib/horarioCadastroOptions";
import {
  imageFileToCompressedDataUrl,
  isLocalImageUploadEnabled,
  uploadImageFile,
} from "@/lib/uploadImage";
import {
  PROGRAM_PERIOD_ORDER,
  groupProgramItensByPeriod,
} from "@/lib/eventPeriod";
import {
  ProgramIcon,
  PROGRAM_ICON_OPTIONS,
} from "@/components/agenda/programIcons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import SafeImg from "@/components/shared/SafeImg";
import {
  resolvePastorAvatarUrl,
  resolvePreletorAvatarUrl,
} from "@/lib/agendaPreletorAvatar";
import { buildEventoApiPayload, normalizeEventoDate } from "@/lib/eventoPayload";
import { hydrateMemberRegistryFromPublicWorkspace } from "@/lib/memberRegistry";
import { listEventosMerged } from "@/lib/eventosQuery";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
  mergeRemoteAgendaSugestoes,
} from "@/lib/publicWorkspace";
import { DEFAULT_AGENDA_SUGESTOES } from "@/lib/agendaSugestoesDefaults";

/** Abre o seletor nativo de data/hora (Firefox e outros). */
function openNativePicker(e) {
  const el = e.currentTarget;
  if (typeof el.showPicker === "function") {
    try {
      el.showPicker();
    } catch {
      /* contexto inválido ou bloqueado */
    }
  }
}

/**
 * Campo date/time: clique em qualquer zona abre o menu nativo.
 * Em Chromium/WebKit o indicador cobre o campo inteiro (invisível).
 */
const nativePickerInputClass = cn(
  "cursor-pointer",
  "relative",
  "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0",
  "[&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full",
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
);

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
  /** Ex.: mostrar rótulo PT na lista quando o valor guardado é um slug */
  formatSuggestion,
}) {
  const [inputVal, setInputVal] = useState(value || "");
  const [showDrop, setShowDrop] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setInputVal(value || "");
  }, [value]);

  const select = (v) => {
    onChange(v);
    setInputVal(v);
    setShowDrop(false);
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onFocusCapture={() => setShowDrop(true)}
      onBlurCapture={(e) => {
        const next = e.relatedTarget;
        if (wrapRef.current && next && wrapRef.current.contains(next)) return;
        setShowDrop(false);
      }}
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
        {showDrop && sugestoes.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  onMouseDown={() => select(s)}
                >
                  {formatSuggestion ? formatSuggestion(s) : s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const empty = {
  titulo: "",
  descricao: "",
  data: "",
  horario: "",
  horario_fim: "",
  local: "",
  categoria: "culto",
  preletor: "",
  pastor: "",
  imagem_url: "",
  destaque: false,
  programacao: [],
  cor_barra: "auto",
  tem_programacao: false,
  programacao_text_color: "#ffffff",
  programacao_banner_url: "",
};

/**
 * Formulário de evento em modal.
 * @param {boolean} open — controlado pelo pai
 * @param {() => void} [onDeleted] — após apagar o evento (ex.: navegar para lista)
 */
export default function EventoFormPanel({
  open,
  evento,
  onCancel,
  onDeleted,
  onSaved,
  existingEventos = [],
}) {
  const [form, setForm] = useState(empty);
  const [sugestoes, setSugestoes] = useState(() =>
    mergeRemoteAgendaSugestoes(DEFAULT_SUGESTOES, {}),
  );
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgError, setImgError] = useState("");
  const [uploadingProgBanner, setUploadingProgBanner] = useState(false);
  const [progBannerError, setProgBannerError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const imgRef = useRef();
  const progBannerRef = useRef();
  const previewBlobRef = useRef(null);
  const previewProgBannerBlobRef = useRef(null);
  const queryClient = useQueryClient();
  const exportRef = useRef(null);
  const [step, setStep] = useState("dados"); // "dados" | "programacao"
  const [conflictError, setConflictError] = useState("");

  const { data: publicWs } = useQuery({
    queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
    queryFn: fetchPublicWorkspaceJson,
    enabled: open,
    staleTime: 60_000,
  });

  const { data: fetchedEventos = [] } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
    enabled: open && (!Array.isArray(existingEventos) || existingEventos.length === 0),
    staleTime: 15_000,
  });

  const effectiveEventos =
    Array.isArray(existingEventos) && existingEventos.length > 0
      ? existingEventos
      : fetchedEventos;

  useEffect(() => {
    if (publicWs == null) return;
    hydrateMemberRegistryFromPublicWorkspace(publicWs);
    if (publicWs.agenda_sugestoes && typeof publicWs.agenda_sugestoes === "object") {
      setSugestoes(
        mergeRemoteAgendaSugestoes(DEFAULT_SUGESTOES, publicWs.agenda_sugestoes),
      );
    }
  }, [publicWs]);

  const revokePreviewBlob = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
  };

  const revokeProgBannerPreviewBlob = () => {
    if (previewProgBannerBlobRef.current) {
      URL.revokeObjectURL(previewProgBannerBlobRef.current);
      previewProgBannerBlobRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokePreviewBlob();
      revokeProgBannerPreviewBlob();
    };
  }, []);

  const handleImageUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImgError("Selecione um ficheiro de imagem (JPEG, PNG, WebP, etc.).");
      return;
    }
    setImgError("");
    setUploadingImg(true);

    revokePreviewBlob();
    const blobUrl = URL.createObjectURL(file);
    previewBlobRef.current = blobUrl;
    set("imagem_url", blobUrl);

    try {
      const { file_url: url } = await uploadImageFile(file);
      revokePreviewBlob();
      set("imagem_url", url);
    } catch (err) {
      if (isLocalImageUploadEnabled()) {
        console.warn("[Evento] uploadImageFile:", err);
        setImgError("Não foi possível processar a imagem.");
      } else {
        console.warn("[Evento] UploadFile:", err);
        void (async () => {
          try {
            const compressed = await imageFileToCompressedDataUrl(file);
            revokePreviewBlob();
            set("imagem_url", compressed);
            setImgError(
              "Não foi possível enviar ao servidor; a imagem foi incorporada localmente (comprimida). Guarde o evento.",
            );
          } catch {
            setImgError("Não foi possível processar a imagem.");
          }
        })();
      }
    } finally {
      setUploadingImg(false);
    }
  };

  const clearImagem = () => {
    revokePreviewBlob();
    setImgError("");
    set("imagem_url", "");
  };

  const handleProgramacaoBannerUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProgBannerError("Selecione um ficheiro de imagem (JPEG, PNG, WebP, etc.).");
      return;
    }

    setProgBannerError("");
    setUploadingProgBanner(true);

    revokeProgBannerPreviewBlob();
    const blobUrl = URL.createObjectURL(file);
    previewProgBannerBlobRef.current = blobUrl;
    set("programacao_banner_url", blobUrl);

    try {
      const { file_url: url } = await uploadImageFile(file);
      revokeProgBannerPreviewBlob();
      set("programacao_banner_url", url);
    } catch (err) {
      if (isLocalImageUploadEnabled()) {
        console.warn("[Evento] uploadImageFile (banner programação):", err);
        setProgBannerError("Não foi possível processar a imagem.");
      } else {
        console.warn("[Evento] UploadFile (banner programação):", err);
        void (async () => {
          try {
            const compressed = await imageFileToCompressedDataUrl(file);
            revokeProgBannerPreviewBlob();
            set("programacao_banner_url", compressed);
            setProgBannerError(
              "Não foi possível enviar ao servidor; a imagem foi incorporada localmente (comprimida). Guarde o evento.",
            );
          } catch {
            setProgBannerError("Não foi possível processar a imagem.");
          }
        })();
      }
    } finally {
      setUploadingProgBanner(false);
    }
  };

  const clearProgramacaoBanner = () => {
    revokeProgBannerPreviewBlob();
    setProgBannerError("");
    set("programacao_banner_url", "");
  };

  useEffect(() => {
    if (!evento) {
      setForm({ ...empty, programacao: [] });
      setStep("dados");
      return;
    }
    const merged = {
      ...empty,
      ...evento,
      data: normalizeEventoDate(evento.data),
      programacao: Array.isArray(evento.programacao) ? evento.programacao : [],
    };
    merged.tem_programacao =
      Boolean(merged.tem_programacao) ||
      (Array.isArray(merged.programacao) && merged.programacao.length > 0);
    setForm(merged);
    setStep("dados");
  }, [evento, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const hasProgramacao = Boolean(form.tem_programacao);
  const hasAnyProgramItem = (Array.isArray(form.programacao) ? form.programacao : []).some(
    (d) => Array.isArray(d?.itens) && d.itens.some((it) => String(it?.titulo || "").trim()),
  );

  const downloadProgramacao = async (format) => {
    const el = exportRef.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#0b0b0f",
        scale: 1,
        width: 1280,
        height: 720,
        windowWidth: 1280,
        windowHeight: 720,
        useCORS: true,
      });
      const mime = format === "jpg" ? "image/jpeg" : "image/png";
      const ext = format === "jpg" ? "jpg" : "png";
      const dataUrl =
        mime === "image/jpeg" ? canvas.toDataURL(mime, 0.92) : canvas.toDataURL(mime);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `programacao-${String(form.titulo || "evento").trim() || "evento"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast({
        title: "Não foi possível baixar a programação",
        description: String(err?.message || "Erro ao gerar imagem."),
        variant: "destructive",
      });
    }
  };

  const addDia = () => {
    const next = Array.isArray(form.programacao) ? [...form.programacao] : [];
    next.push({
      id: `dia-${Date.now()}`,
      titulo: `Dia ${next.length + 1}`,
      itens: [],
    });
    set("programacao", next);
  };

  const updateDia = (diaId, patch) => {
    const next = (Array.isArray(form.programacao) ? form.programacao : []).map(
      (d) => (d.id === diaId ? { ...d, ...patch } : d),
    );
    set("programacao", next);
  };

  const removeDia = (diaId) => {
    const next = (Array.isArray(form.programacao) ? form.programacao : []).filter(
      (d) => d.id !== diaId,
    );
    set("programacao", next);
  };

  const addItem = (diaId) => {
    const next = (Array.isArray(form.programacao) ? form.programacao : []).map(
      (d) => {
        if (d.id !== diaId) return d;
        const itens = Array.isArray(d.itens) ? [...d.itens] : [];
        itens.push({
          id: `it-${Date.now()}`,
          hora: "",
          titulo: "",
          icone: "Clock",
        });
        return { ...d, itens };
      },
    );
    set("programacao", next);
  };

  const updateItem = (diaId, itemId, patch) => {
    const next = (Array.isArray(form.programacao) ? form.programacao : []).map(
      (d) => {
        if (d.id !== diaId) return d;
        const itens = (Array.isArray(d.itens) ? d.itens : []).map((it) =>
          it.id === itemId ? { ...it, ...patch } : it,
        );
        return { ...d, itens };
      },
    );
    set("programacao", next);
  };

  const removeItem = (diaId, itemId) => {
    const next = (Array.isArray(form.programacao) ? form.programacao : []).map(
      (d) => {
        if (d.id !== diaId) return d;
        const itens = (Array.isArray(d.itens) ? d.itens : []).filter(
          (it) => it.id !== itemId,
        );
        return { ...d, itens };
      },
    );
    set("programacao", next);
  };

  const save = useMutation({
    mutationFn: async (raw) => {
      const payload = buildEventoApiPayload({
        ...raw,
        cor_barra: "auto",
        preletor_avatar_url: resolvePreletorAvatarUrl(
          sugestoes.preletor_avatars,
          raw.preletor,
        ),
        pastor_avatar_url: resolvePastorAvatarUrl(
          sugestoes.pastor_avatars,
          raw.pastor,
        ),
      });
      if (evento) {
        return api.entities.Evento.update(evento.id, payload);
      }
      return api.entities.Evento.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast({
        title: evento ? "Evento salvo" : "Evento criado",
        description: "As alterações foram salvas com sucesso.",
      });
      if (typeof onSaved === "function") onSaved();
      else onCancel?.();
    },
    onError: (err) => {
      const msg =
        err?.message ||
        (typeof err?.data === "object" && err.data?.message) ||
        "Não foi possível salvar o evento.";
      toast({
        title: "Não foi possível salvar",
        description: String(msg),
        variant: "destructive",
      });
    },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      if (id == null || id === "") {
        throw new Error("Evento sem identificador.");
      }
      return api.entities.Evento.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      if (typeof onDeleted === "function") onDeleted();
      else onCancel?.();
    },
    onError: (err) => {
      toast({
        title: "Não foi possível excluir",
        description: String(err?.message || "Erro ao excluir o evento."),
        variant: "destructive",
      });
    },
  });

  const isValid =
    String(form.titulo || "").trim() &&
    String(form.data || "").trim() &&
    String(form.categoria || "").trim() &&
    String(form.local || "").trim() &&
    String(form.horario || "").trim();

  const horarioOpcoes = useMemo(
    () =>
      horarioSelectOptions(
        sugestoes.horario,
        form.horario,
        form.horario_fim,
      ),
    [sugestoes.horario, form.horario, form.horario_fim],
  );

  /** Horários da programação (por dia) incluídos nas opções para não perder valores ao editar. */
  const horarioProgramOpcoes = useMemo(() => {
    const extras = [];
    for (const dia of Array.isArray(form.programacao) ? form.programacao : []) {
      for (const it of Array.isArray(dia.itens) ? dia.itens : []) {
        const h = String(it?.hora ?? "").trim();
        if (h) extras.push(h);
      }
    }
    return horarioSelectOptions(
      sugestoes.horario,
      form.horario,
      form.horario_fim,
      ...extras,
    );
  }, [sugestoes.horario, form.horario, form.horario_fim, form.programacao]);

  const conflictInfo = useMemo(() => {
    const date = normalizeEventoDate(form.data);
    const h = String(form.horario || "").trim();
    const cat = String(form.categoria || "").trim();
    if (!date || !h || !cat) return { hasConflict: false, sample: null };
    const curId = evento?.id != null ? String(evento.id) : null;
    const match = (Array.isArray(effectiveEventos) ? effectiveEventos : []).find((e) => {
      const id = e?.id != null ? String(e.id) : null;
      if (curId && id && id === curId) return false;
      const ed = normalizeEventoDate(e?.data);
      const eh = String(e?.horario || "").trim();
      const ec = String(e?.categoria || "").trim();
      return ed === date && eh === h && ec === cat;
    });
    return { hasConflict: Boolean(match), sample: match || null };
  }, [effectiveEventos, form.data, form.horario, form.categoria, evento?.id]);

  /** Mesma lógica dos cartões na lista; em «Novo evento» força auto (valor gravado). */
  const previewBarClass = useMemo(
    () =>
      eventCardBarClass(
        {
          titulo: String(form.titulo || "").trim(),
          categoria: String(form.categoria || "").trim() || "culto",
          cor_barra: evento ? form.cor_barra || "auto" : "auto",
        },
        CATEGORY_BAR_CLASS,
        sugestoes.titulo_cor_barra,
      ),
    [
      evento,
      form.titulo,
      form.categoria,
      form.cor_barra,
      sugestoes.titulo_cor_barra,
    ],
  );

  useEffect(() => {
    if (!open) {
      setConflictError("");
      return;
    }
    if (!conflictInfo.hasConflict) {
      setConflictError("");
      return;
    }
    setConflictError(
      "Já existe um evento cadastrado com a mesma data, horário e categoria. Ajuste antes de salvar.",
    );
  }, [open, conflictInfo.hasConflict]);

  const handleDialogOpenChange = (next) => {
    if (!next) onCancel?.();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        id="evento-form-panel"
        className="max-w-3xl w-[calc(100%-1.5rem)] max-h-[min(92vh,920px)] p-0 gap-0 flex flex-col overflow-hidden sm:max-w-3xl [&>button.absolute]:hidden"
      >
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border bg-muted/40 shrink-0 text-left space-y-1.5">
          <DialogTitle>
            {evento ? "Editar evento" : "Novo evento"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo e guarde. A agenda usa apenas a data para
            mostrar o evento no calendário.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn("h-1.5 w-full shrink-0", previewBarClass)}
          aria-hidden
        />

      <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 max-h-[min(70vh,720px)]">
        {/* Destaque na home (discreto, no topo) */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-2">
          <p className="text-sm font-semibold text-foreground">
            Destacar evento
          </p>
          <Switch
            checked={form.destaque}
            onCheckedChange={(v) => set("destaque", v)}
          />
        </div>

        {/* Etapas */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold px-2 py-1 rounded-md border",
                step === "dados"
                  ? "bg-background text-foreground border-border"
                  : "bg-muted/40 text-muted-foreground border-border/60",
              )}
            >
              1) Dados
            </span>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-1 rounded-md border",
                step === "programacao"
                  ? "bg-background text-foreground border-border"
                  : "bg-muted/40 text-muted-foreground border-border/60",
              )}
            >
              2) Programação
            </span>
          </div>

          <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                !hasProgramacao
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={!hasProgramacao}
              onClick={() => {
                set("tem_programacao", false);
                set("programacao", []);
                setStep("dados");
              }}
            >
              Sem programação
            </button>
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                hasProgramacao
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={hasProgramacao}
              onClick={() => set("tem_programacao", true)}
            >
              Com programação
            </button>
          </div>
        </div>

        {step === "dados" ? (
          <>
        <ComboSugestao
          label="Título"
          required
          value={form.titulo}
          onChange={(v) => set("titulo", v)}
          sugestoes={sugestoes.titulo}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="evento-data">Data *</Label>
            <div className="relative mt-1">
              <Input
                id="evento-data"
                type="date"
                className={nativePickerInputClass}
                value={form.data}
                onChange={(e) => set("data", e.target.value)}
                onClick={openNativePicker}
              />
            </div>
          </div>
          <ComboSugestao
            label="Categoria"
            required
            value={form.categoria}
            onChange={(v) => set("categoria", v)}
            sugestoes={sugestoes.categoria}
            formatSuggestion={(slug) =>
              CATEGORIA_LABEL_BY_SLUG[slug] || slug
            }
          />
        </div>

        <ComboSugestao
          label="Local"
          required
          value={form.local}
          onChange={(v) => set("local", v)}
          sugestoes={sugestoes.local || []}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="evento-hora-inicio">Horário início *</Label>
            <Select
              value={form.horario || undefined}
              onValueChange={(v) => set("horario", v)}
            >
              <SelectTrigger id="evento-hora-inicio" className="w-full">
                <SelectValue placeholder="Selecione o horário (cadastro)" />
              </SelectTrigger>
              <SelectContent>
                {horarioOpcoes.map((t) => (
                  <SelectItem key={`ini-${t}`} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="evento-hora-fim">Horário fim</Label>
            <Select
              value={
                form.horario_fim
                  ? form.horario_fim
                  : HORARIO_FIM_VAZIO
              }
              onValueChange={(v) =>
                set(
                  "horario_fim",
                  v === HORARIO_FIM_VAZIO ? "" : v,
                )
              }
            >
              <SelectTrigger id="evento-hora-fim" className="w-full">
                <SelectValue placeholder="Opcional — cadastro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={HORARIO_FIM_VAZIO}>
                  — Sem horário de fim —
                </SelectItem>
                {horarioOpcoes.map((t) => (
                  <SelectItem key={`fim-${t}`} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ComboSugestao
          label="Preletor"
          value={form.preletor}
          onChange={(v) => set("preletor", v)}
          sugestoes={sugestoes.preletor}
        />

        <ComboSugestao
          label="Presbítero"
          value={form.pastor}
          onChange={(v) => set("pastor", v)}
          sugestoes={sugestoes.pastor}
        />

        <div>
          <Label>Imagem de fundo do card</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-0">
            {String(form.imagem_url || "").trim()
              ? "Esta imagem substitui o fundo definido por título no cadastro (Títulos sugeridos)."
              : "Se não enviar imagem aqui, o cartão no site pode usar o fundo configurado no cadastro para este título. Ao adicionar imagem, ela passa a ter prioridade."}
          </p>
          <input
            ref={imgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imgRef.current.click()}
              disabled={uploadingImg}
              className="gap-2"
            >
              <ImagePlus className="w-4 h-4" />
              {uploadingImg
                ? "Enviando..."
                : form.imagem_url
                  ? "Trocar imagem"
                  : "Adicionar imagem"}
            </Button>
            {form.imagem_url && (
              <>
                <SafeImg
                  src={form.imagem_url}
                  alt="Pré-visualização da imagem do card"
                  className="h-20 w-32 object-cover rounded-lg border border-border bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={clearImagem}
                >
                  Remover imagem
                </Button>
              </>
            )}
          </div>
          {imgError && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5">
              {imgError}
            </p>
          )}
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea
            className="mt-1"
            value={form.descricao}
            onChange={(e) => set("descricao", e.target.value)}
            rows={3}
            placeholder="Descrição opcional..."
          />
        </div>

        {/* Destaque na home: movido para o topo do formulário */}
          </>
        ) : null}

        {step === "programacao" && hasProgramacao ? (
          <>
            <div className="border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">Programação</p>
                  <p className="text-xs text-muted-foreground">
                    Por dia, ícone por horário e blocos agrupados (manhã, tarde,
                    noite).
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addDia}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar dia
                </Button>
              </div>

              {Array.isArray(form.programacao) && form.programacao.length > 0 ? (
                <div className="space-y-4">
                  {form.programacao.map((dia) => (
                    <div key={dia.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={dia.titulo || ""}
                          onChange={(e) =>
                            updateDia(dia.id, { titulo: e.target.value })
                          }
                          placeholder="Título do dia (ex.: Sexta, Sábado...)"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive shrink-0"
                          onClick={() => removeDia(dia.id)}
                          title="Remover dia"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="mt-3 space-y-4">
                        {PROGRAM_PERIOD_ORDER.map((period) => {
                          const buckets = groupProgramItensByPeriod(dia.itens);
                          const rowItems = buckets[period.key];
                          if (!rowItems.length) return null;
                          return (
                            <div key={`${dia.id}-${period.key}`} className="space-y-2">
                              <p
                                className={`text-[10px] font-bold uppercase tracking-wide pb-1.5 ${period.headingClass}`}
                              >
                                {period.label}
                              </p>
                              {rowItems.map((it) => (
                                <div
                                  key={it.id}
                                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2"
                                >
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Select
                                      value={it.icone || "Clock"}
                                      onValueChange={(v) =>
                                        updateItem(dia.id, it.id, { icone: v })
                                      }
                                    >
                                      <SelectTrigger
                                        className="h-9 w-10 shrink-0 px-0 justify-center"
                                        title="Ícone do horário"
                                        aria-label="Ícone do horário"
                                      >
                                        <ProgramIcon
                                          name={it.icone || "Clock"}
                                          className="h-4 w-4"
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PROGRAM_ICON_OPTIONS.map((opt) => (
                                          <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                          >
                                            <span className="flex items-center gap-2">
                                              <opt.Icon className="h-4 w-4 shrink-0" />
                                              {opt.label}
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select
                                      value={it.hora || undefined}
                                      onValueChange={(v) =>
                                        updateItem(dia.id, it.id, { hora: v })
                                      }
                                    >
                                      <SelectTrigger
                                        className="h-9 w-[8.5rem] shrink-0"
                                        aria-label="Hora (cadastro)"
                                        id={`prog-hora-${dia.id}-${it.id}`}
                                      >
                                        <SelectValue placeholder="Hora (cadastro)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {horarioProgramOpcoes.map((t) => (
                                          <SelectItem
                                            key={`prog-${dia.id}-${it.id}-${t}`}
                                            value={t}
                                          >
                                            {t}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Input
                                    className="min-w-[10rem] flex-1"
                                    value={it.titulo || ""}
                                    onChange={(e) =>
                                      updateItem(dia.id, it.id, {
                                        titulo: e.target.value,
                                      })
                                    }
                                    placeholder="Atividade (ex.: Abertura, Louvor...)"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive shrink-0"
                                    onClick={() => removeItem(dia.id, it.id)}
                                    title="Remover item"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          );
                        })}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => addItem(dia.id)}
                        >
                          <Plus className="w-4 h-4" /> Adicionar horário
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum dia adicionado ainda.
                </p>
              )}
            </div>

            {/* Exportar programação */}
            {hasAnyProgramItem ? (
              <div className="border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-foreground">
                      Baixar programação (1280×720)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Gere uma imagem pronta para postar (PNG ou JPG).
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadProgramacao("png")}
                    >
                      Baixar PNG
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadProgramacao("jpg")}
                    >
                      Baixar JPG
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="prog-text-color">Cor do texto</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        id="prog-text-color"
                        type="color"
                        className="h-10 w-16 px-1 py-1"
                        value={form.programacao_text_color || "#ffffff"}
                        onChange={(e) => set("programacao_text_color", e.target.value)}
                        aria-label="Cor do texto"
                      />
                      <Input
                        type="text"
                        value={form.programacao_text_color || "#ffffff"}
                        onChange={(e) => set("programacao_text_color", e.target.value)}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Imagem no topo</Label>
                    <input
                      ref={progBannerRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProgramacaoBannerUpload}
                    />
                    <div className="mt-1 flex items-center gap-3 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => progBannerRef.current?.click()}
                        disabled={uploadingProgBanner}
                        className="gap-2"
                      >
                        <ImagePlus className="w-4 h-4" />
                        {uploadingProgBanner
                          ? "Enviando..."
                          : form.programacao_banner_url
                            ? "Trocar imagem"
                            : "Adicionar imagem"}
                      </Button>
                      {form.programacao_banner_url && (
                        <>
                          <SafeImg
                            src={form.programacao_banner_url}
                            alt="Pré-visualização do topo da programação"
                            className="h-20 w-32 object-cover rounded-lg border border-border bg-muted"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={clearProgramacaoBanner}
                          >
                            Remover imagem
                          </Button>
                        </>
                      )}
                    </div>
                    {progBannerError && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5">
                        {progBannerError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Render invisível para export */}
                <div className="sr-only" aria-hidden>
                  <div
                    ref={exportRef}
                    style={{
                      width: 1280,
                      height: 720,
                      background: "#0b0b0f",
                      color: form.programacao_text_color || "#ffffff",
                      position: "relative",
                      overflow: "hidden",
                      fontFamily:
                        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
                    }}
                  >
                    {/* Topo */}
                    <div style={{ position: "relative", height: 180 }}>
                      {form.programacao_banner_url ? (
                        <img
                          src={form.programacao_banner_url}
                          alt=""
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          crossOrigin="anonymous"
                          onError={(e) => {
                            const t = e.currentTarget;
                            t.style.display = "none";
                            const p = t.parentElement;
                            if (p) p.style.backgroundColor = "#000000";
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.85))",
                        }}
                      />
                      <div style={{ position: "relative", padding: "34px 42px" }}>
                        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.05 }}>
                          {String(form.titulo || "").trim()}
                        </div>
                        {String(form.data || "").trim() ? (
                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 20,
                              fontWeight: 700,
                              opacity: 0.92,
                            }}
                          >
                            {String(form.data || "").trim()}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Colunas por dia */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 18,
                        padding: "22px 26px 26px",
                        height: 540,
                        boxSizing: "border-box",
                      }}
                    >
                      {(Array.isArray(form.programacao) ? form.programacao : [])
                        .slice(0, 3)
                        .map((dia) => (
                          <div
                            key={dia.id}
                            style={{
                              border: "1px solid rgba(255,255,255,0.14)",
                              borderRadius: 18,
                              padding: 18,
                              background: "rgba(255,255,255,0.03)",
                              overflow: "hidden",
                            }}
                          >
                            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
                              {String(dia.titulo || "").trim() || "Dia"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {(Array.isArray(dia.itens) ? dia.itens : [])
                                .filter((it) => String(it?.titulo || "").trim())
                                .slice(0, 10)
                                .map((it) => (
                                  <div
                                    key={it.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      padding: "10px 12px",
                                      borderRadius: 14,
                                      background: "rgba(0,0,0,0.22)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 78,
                                        fontWeight: 900,
                                        fontSize: 14,
                                        opacity: 0.95,
                                      }}
                                    >
                                      {String(it.hora || "").trim() || "--:--"}
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>
                                      {String(it.titulo || "").trim()}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Para baixar a programação, cadastre ao menos 1 item (horário + título).
              </p>
            )}
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col-reverse sm:flex-row sm:justify-between gap-3 px-6 py-4 border-t border-border bg-muted/20 relative z-10">
        {evento ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={del.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!evento?.id) return;
              setDeleteConfirmOpen(true);
            }}
          >
            {del.isPending ? "A excluir..." : "Excluir evento"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2 sm:ml-auto">
          <Button type="button" variant="outline" onClick={() => onCancel?.()}>
            Cancelar
          </Button>
          {step === "programacao" && hasProgramacao ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("dados")}
              disabled={save.isPending}
            >
              Voltar
            </Button>
          ) : null}

          {step === "dados" && hasProgramacao ? (
            <Button
              type="button"
              variant="success"
              onClick={() => setStep("programacao")}
              disabled={!isValid || save.isPending}
            >
              Avançar
            </Button>
          ) : (
            <Button
              type="button"
              variant="success"
              onClick={() => {
                if (conflictInfo.hasConflict) {
                  setConflictError(
                    "Não foi possível salvar: já existe um evento com a mesma data, horário e categoria.",
                  );
                  return;
                }
                save.mutate(form);
              }}
              disabled={!isValid || save.isPending || conflictInfo.hasConflict}
            >
              {save.isPending ? "A salvar…" : "Salvar"}
            </Button>
          )}
        </div>
        {conflictError ? (
          <p className="mt-2 text-xs text-destructive sm:ml-auto sm:text-right max-w-[34rem]">
            {conflictError}
          </p>
        ) : null}
      </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="Excluir evento?"
      description="Esta ação não pode ser desfeita."
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
      onConfirm={() => {
        if (evento?.id) del.mutate(evento.id);
      }}
    />
    </>
  );
}

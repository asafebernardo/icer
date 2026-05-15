import { useState, useEffect, useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { X, Plus, ImagePlus, Star, Palette } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { EVENT_CARD_COLOR_OPTIONS } from "@/lib/eventCardColors";
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
import { buildEventoApiPayload, normalizeEventoDate } from "@/lib/eventoPayload";

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

const categorias = [
  { value: "culto", label: "Culto" },
  { value: "estudo", label: "Estudo" },
  { value: "jovens", label: "Jovens" },
  { value: "mulheres", label: "Mulheres" },
  { value: "homens", label: "Homens" },
  { value: "criancas", label: "Crianças" },
  { value: "especial", label: "Especial" },
  { value: "conferencia", label: "Conferência" },
];

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
  categoria: categorias.map((c) => c.value),
};

const CATEGORIA_LABEL_BY_SLUG = Object.fromEntries(
  categorias.map((c) => [c.value, c.label]),
);

const LOCAIS_PADRAO = ["Sede local", "Outros"];

const SUGESTOES_KEY = "agenda_sugestoes";

function loadSugestoes() {
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

function saveSugestoes(s) {
  localStorage.setItem(SUGESTOES_KEY, JSON.stringify(s));
}

function ComboSugestao({
  label,
  value,
  onChange,
  sugestoes,
  onSugestoesChange,
  required,
  /** Ex.: mostrar rótulo PT na lista quando o valor guardado é um slug */
  formatSuggestion,
}) {
  const [inputVal, setInputVal] = useState(value || "");
  const [showDrop, setShowDrop] = useState(false);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setInputVal(value || "");
  }, [value]);

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
    <div className="relative">
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
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 200)}
          placeholder={`${label}...`}
        />
        {showDrop && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {sugestoes.map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted group"
                >
                  <button
                    type="button"
                    className="flex-1 text-left text-sm text-foreground"
                    onMouseDown={() => select(s)}
                  >
                    {formatSuggestion ? formatSuggestion(s) : s}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      removeSugestao(s);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-2 flex gap-2">
              <Input
                className="h-7 text-xs"
                placeholder="Adicionar opção..."
                value={newItem}
                onMouseDown={(e) => e.stopPropagation()}
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  addSugestao();
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LocalField({ value, onChange }) {
  const [modo, setModo] = useState(
    value && !LOCAIS_PADRAO.includes(value) ? "livre" : "select",
  );
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
}) {
  const [form, setForm] = useState(empty);
  const [sugestoes, setSugestoes] = useState(loadSugestoes);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgError, setImgError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const imgRef = useRef();
  const previewBlobRef = useRef(null);
  const queryClient = useQueryClient();

  const revokePreviewBlob = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
  };

  useEffect(() => {
    return () => revokePreviewBlob();
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

  useEffect(() => {
    if (!evento) {
      setForm({ ...empty, programacao: [] });
      return;
    }
    const merged = {
      ...empty,
      ...evento,
      data: normalizeEventoDate(evento.data),
      programacao: Array.isArray(evento.programacao) ? evento.programacao : [],
    };
    setForm(merged);
  }, [evento, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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

  const updateSugestoes = (campo, lista) => {
    const updated = { ...sugestoes, [campo]: lista };
    setSugestoes(updated);
    saveSugestoes(updated);
  };

  const save = useMutation({
    mutationFn: async (raw) => {
      const payload = buildEventoApiPayload(raw);
      if (evento) {
        return api.entities.Evento.update(evento.id, payload);
      }
      return api.entities.Evento.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
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
    String(form.local || "").trim();

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

      <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 max-h-[min(70vh,720px)]">
        <ComboSugestao
          label="Título"
          required
          value={form.titulo}
          onChange={(v) => set("titulo", v)}
          sugestoes={sugestoes.titulo}
          onSugestoesChange={(lista) => updateSugestoes("titulo", lista)}
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
            onSugestoesChange={(lista) => updateSugestoes("categoria", lista)}
            formatSuggestion={(slug) =>
              CATEGORIA_LABEL_BY_SLUG[slug] || slug
            }
          />
        </div>

        <div>
          <Label>Cor do card (barra e bloco da data)</Label>
          <div
            className="mt-2 flex flex-wrap gap-2 items-center"
            role="group"
            aria-label="Cor do card"
          >
            <button
              type="button"
              title="Igual à categoria"
              aria-label="Igual à categoria"
              aria-pressed={(form.cor_barra || "auto") === "auto"}
              onClick={() => set("cor_barra", "auto")}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                (form.cor_barra || "auto") === "auto"
                  ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                  : "border-dashed border-muted-foreground/60 bg-muted/50 hover:bg-muted",
              )}
            >
              <Palette className="w-4 h-4 text-muted-foreground" />
            </button>
            {EVENT_CARD_COLOR_OPTIONS.filter((o) => o.tailwind).map((o) => {
              const selected = form.cor_barra === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  title={o.label}
                  aria-label={o.label}
                  aria-pressed={selected}
                  onClick={() => set("cor_barra", o.value)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 border-transparent transition-all shrink-0 shadow-sm",
                    o.tailwind,
                    selected &&
                      "ring-2 ring-offset-2 ring-foreground scale-105 z-10",
                  )}
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Paleta: mesma cor da categoria. Círculos: cor fixa no card.
          </p>
        </div>

        <LocalField value={form.local} onChange={(v) => set("local", v)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="evento-hora-inicio">Horário início</Label>
            <div className="relative mt-1">
              <Input
                id="evento-hora-inicio"
                type="time"
                className={nativePickerInputClass}
                value={form.horario}
                onChange={(e) => set("horario", e.target.value)}
                onClick={openNativePicker}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="evento-hora-fim">Horário fim</Label>
            <div className="relative mt-1">
              <Input
                id="evento-hora-fim"
                type="time"
                className={nativePickerInputClass}
                value={form.horario_fim}
                onChange={(e) => set("horario_fim", e.target.value)}
                onClick={openNativePicker}
              />
            </div>
          </div>
        </div>

        <ComboSugestao
          label="Preletor"
          value={form.preletor}
          onChange={(v) => set("preletor", v)}
          sugestoes={sugestoes.preletor}
          onSugestoesChange={(lista) => updateSugestoes("preletor", lista)}
        />

        <ComboSugestao
          label="Pastor"
          value={form.pastor}
          onChange={(v) => set("pastor", v)}
          sugestoes={sugestoes.pastor}
          onSugestoesChange={(lista) => updateSugestoes("pastor", lista)}
        />

        <div>
          <Label>Imagem de fundo do card</Label>
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
                <img
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
                                <Input
                                  type="time"
                                  className={cn(
                                    nativePickerInputClass,
                                    "h-9 w-[7.25rem] shrink-0",
                                  )}
                                  value={it.hora || ""}
                                  onChange={(e) =>
                                    updateItem(dia.id, it.id, {
                                      hora: e.target.value,
                                    })
                                  }
                                  onClick={openNativePicker}
                                  aria-label="Hora"
                                />
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

        <div className="flex items-center gap-3 bg-accent/5 p-3 rounded-lg border border-accent/10">
          <Star className="w-4 h-4 text-accent fill-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Destaque na home
            </p>
            <p className="text-xs text-muted-foreground">
              Mostrar este evento em destaque
            </p>
          </div>
          <Switch
            checked={form.destaque}
            onCheckedChange={(v) => set("destaque", v)}
          />
        </div>
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
          <Button
            type="button"
            variant="success"
            onClick={() => save.mutate(form)}
            disabled={!isValid || save.isPending}
          >
            {save.isPending ? "A salvar…" : "Salvar"}
          </Button>
        </div>
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

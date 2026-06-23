import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowDownAZ,
  BookMarked,
  Check,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EVENT_CARD_COLOR_OPTIONS } from "@/lib/eventCardColors";
import { cn } from "@/lib/utils";
import SafeImg from "@/components/shared/SafeImg";
import {
  imageFileToCompressedDataUrl,
  isLocalImageUploadEnabled,
  uploadImageFile,
} from "@/lib/uploadImage";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
  mergeRemoteAgendaSugestoes,
  putAgendaSugestoesRemote,
} from "@/lib/publicWorkspace";
import AdminAgendaSimpleGridSection from "@/components/dashboard/AdminAgendaSimpleGridSection";
import {
  AGENDA_SUGESTOES_KEYS,
  AGENDA_SUGESTOES_FIELD_META,
  DEFAULT_AGENDA_SUGESTOES,
} from "@/lib/agendaSugestoesDefaults";

const MAX_TITULO_BG_IMAGES = 8;

/** Listas em que cada nome pode ter foto associada (campos no draft). */
const LIST_KEYS_WITH_AVATAR = {
  preletor: "preletor_avatars",
  pastor: "pastor_avatars",
};

function avatarFieldForListKey(listKey) {
  return LIST_KEYS_WITH_AVATAR[listKey] || null;
}

function cloneLists(obj) {
  const out = {};
  for (const k of AGENDA_SUGESTOES_KEYS) {
    out[k] = Array.isArray(obj[k]) ? [...obj[k]] : [];
  }
  out.preletor_avatars =
    obj.preletor_avatars && typeof obj.preletor_avatars === "object"
      ? { ...obj.preletor_avatars }
      : {};
  out.pastor_avatars =
    obj.pastor_avatars && typeof obj.pastor_avatars === "object"
      ? { ...obj.pastor_avatars }
      : {};
  out.titulo_cor_barra =
    obj.titulo_cor_barra && typeof obj.titulo_cor_barra === "object"
      ? { ...obj.titulo_cor_barra }
      : {};
  out.titulo_imagens_fundo = {};
  if (obj.titulo_imagens_fundo && typeof obj.titulo_imagens_fundo === "object") {
    for (const [k, v] of Object.entries(obj.titulo_imagens_fundo)) {
      out.titulo_imagens_fundo[k] = Array.isArray(v) ? [...v] : [];
    }
  }
  return out;
}

/** Ordem alfabética (pt), números tratados de forma natural. */
function sortAlphabeticalPt(arr) {
  return [...arr].sort((a, b) =>
    String(a).localeCompare(String(b), "pt", {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

export default function AdminCadastrosOpcoesPanel() {
  const queryClient = useQueryClient();
  const { data: publicWs, isLoading } = useQuery({
    queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
    queryFn: fetchPublicWorkspaceJson,
    staleTime: 30_000,
  });

  const mergedRemote = useMemo(
    () =>
      mergeRemoteAgendaSugestoes(
        DEFAULT_AGENDA_SUGESTOES,
        publicWs?.agenda_sugestoes,
      ),
    [publicWs?.agenda_sugestoes],
  );

  const [draft, setDraft] = useState(() => cloneLists(mergedRemote));
  const [newLine, setNewLine] = useState(() =>
    Object.fromEntries(AGENDA_SUGESTOES_KEYS.map((k) => [k, ""])),
  );
  /** Edição inline: `chave:índice` ou null */
  const [editFocus, setEditFocus] = useState(null);
  const [editBuffer, setEditBuffer] = useState("");
  /** `lista:nome` em que está a carregar foto */
  const [avatarUploadingKey, setAvatarUploadingKey] = useState(null);
  /** Popover «cor por título»: `titulo:índice` ou null */
  const [tituloCorPopoverOpen, setTituloCorPopoverOpen] = useState(null);
  /** Nome do título em que está a carregar imagem de fundo */
  const [tituloBgUploadingKey, setTituloBgUploadingKey] = useState(null);
  const [activeTab, setActiveTab] = useState(AGENDA_SUGESTOES_KEYS[0]);

  useEffect(() => {
    setDraft(cloneLists(mergedRemote));
    setEditFocus(null);
    setEditBuffer("");
    setTituloCorPopoverOpen(null);
  }, [mergedRemote]);

  const mutation = useMutation({
    mutationFn: (agenda_sugestoes) => putAgendaSugestoesRemote(agenda_sugestoes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUBLIC_WORKSPACE_QUERY_KEY });
      toast.success("Listas de cadastro atualizadas para todo o site.");
    },
    onError: (e) =>
      toast.error(e?.message ? String(e.message) : "Erro ao guardar."),
  });

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(cloneLists(mergedRemote)),
    [draft, mergedRemote],
  );

  const setList = (key, next) => {
    setDraft((d) => ({ ...d, [key]: next }));
  };

  const addItem = (key) => {
    const raw = String(newLine[key] ?? "").trim();
    if (!raw) return;
    const cur = draft[key] || [];
    if (cur.some((x) => String(x).trim().toLowerCase() === raw.toLowerCase())) {
      toast.warning("Este valor já está na lista.");
      return;
    }
    setList(key, [...cur, raw]);
    setNewLine((n) => ({ ...n, [key]: "" }));
  };

  const removeAt = (key, idx) => {
    if (editFocus === `${key}:${idx}`) {
      setEditFocus(null);
      setEditBuffer("");
    }
    const removed = draft[key]?.[idx];
    const cur = [...(draft[key] || [])];
    cur.splice(idx, 1);
    const avField = avatarFieldForListKey(key);
    if (avField && removed != null) {
      const removedName = String(removed);
      setDraft((d) => {
        const av = { ...(d[avField] || {}) };
        delete av[removedName];
        const patch = { ...d, [key]: cur, [avField]: av };
        if (key === "titulo") {
          const tc = { ...(d.titulo_cor_barra || {}) };
          delete tc[removedName];
          patch.titulo_cor_barra = tc;
          const tf = { ...(d.titulo_imagens_fundo || {}) };
          delete tf[removedName];
          patch.titulo_imagens_fundo = tf;
        }
        return patch;
      });
    } else if (key === "titulo" && removed != null) {
      const removedName = String(removed);
      setDraft((d) => {
        const tc = { ...(d.titulo_cor_barra || {}) };
        delete tc[removedName];
        const tf = { ...(d.titulo_imagens_fundo || {}) };
        delete tf[removedName];
        return {
          ...d,
          [key]: cur,
          titulo_cor_barra: tc,
          titulo_imagens_fundo: tf,
        };
      });
    } else {
      setList(key, cur);
    }
  };

  const handleCadastroAvatarPick = async (listKey, personName, e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um ficheiro de imagem.");
      return;
    }
    const nk = String(personName ?? "").trim();
    if (!nk) return;
    const avField = avatarFieldForListKey(listKey);
    if (!avField) return;
    setAvatarUploadingKey(`${listKey}:${nk}`);
    try {
      const { file_url: url } = await uploadImageFile(file);
      setDraft((d) => ({
        ...d,
        [avField]: { ...(d[avField] || {}), [nk]: url },
      }));
    } catch (err) {
      if (isLocalImageUploadEnabled()) {
        try {
          const dataUrl = await imageFileToCompressedDataUrl(file);
          setDraft((d) => ({
            ...d,
            [avField]: { ...(d[avField] || {}), [nk]: dataUrl },
          }));
        } catch {
          toast.error("Não foi possível processar a imagem.");
        }
      } else {
        toast.error(err?.message ? String(err.message) : "Erro ao enviar a imagem.");
      }
    } finally {
      setAvatarUploadingKey(null);
    }
  };

  const handleTituloFundoPick = async (tituloItem, e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um ficheiro de imagem.");
      return;
    }
    const nk = String(tituloItem ?? "").trim();
    if (!nk) return;
    const prev = draft.titulo_imagens_fundo?.[nk];
    const arr = Array.isArray(prev) ? [...prev] : [];
    if (arr.length >= MAX_TITULO_BG_IMAGES) {
      toast.warning(`Máximo de ${MAX_TITULO_BG_IMAGES} imagens por título.`);
      return;
    }
    setTituloBgUploadingKey(nk);
    try {
      const { file_url: url } = await uploadImageFile(file);
      setDraft((d) => ({
        ...d,
        titulo_imagens_fundo: {
          ...(d.titulo_imagens_fundo || {}),
          [nk]: [...(Array.isArray(d.titulo_imagens_fundo?.[nk])
            ? d.titulo_imagens_fundo[nk]
            : []), url],
        },
      }));
    } catch (err) {
      if (isLocalImageUploadEnabled()) {
        try {
          const dataUrl = await imageFileToCompressedDataUrl(file);
          setDraft((d) => ({
            ...d,
            titulo_imagens_fundo: {
              ...(d.titulo_imagens_fundo || {}),
              [nk]: [
                ...(Array.isArray(d.titulo_imagens_fundo?.[nk])
                  ? d.titulo_imagens_fundo[nk]
                  : []),
                dataUrl,
              ],
            },
          }));
        } catch {
          toast.error("Não foi possível processar a imagem.");
        }
      } else {
        toast.error(err?.message ? String(err.message) : "Erro ao enviar a imagem.");
      }
    } finally {
      setTituloBgUploadingKey(null);
    }
  };

  const removeTituloFundoAt = (tituloItem, urlIndex) => {
    const nk = String(tituloItem ?? "").trim();
    if (!nk) return;
    setDraft((d) => {
      const tf = { ...(d.titulo_imagens_fundo || {}) };
      const cur = Array.isArray(tf[nk]) ? [...tf[nk]] : [];
      cur.splice(urlIndex, 1);
      if (cur.length === 0) delete tf[nk];
      else tf[nk] = cur;
      return { ...d, titulo_imagens_fundo: tf };
    });
  };

  const clearCadastroAvatar = (listKey, personName) => {
    const nk = String(personName ?? "").trim();
    const avField = avatarFieldForListKey(listKey);
    if (!avField) return;
    setDraft((d) => {
      const av = { ...(d[avField] || {}) };
      delete av[nk];
      return { ...d, [avField]: av };
    });
  };

  const beginEdit = (key, idx, current) => {
    setEditFocus(`${key}:${idx}`);
    setEditBuffer(String(current ?? ""));
  };

  const cancelEdit = () => {
    setEditFocus(null);
    setEditBuffer("");
  };

  const commitEdit = (key, idx) => {
    const t = String(editBuffer ?? "").trim();
    const cur = [...(draft[key] || [])];
    if (!t) {
      toast.warning("O texto não pode ficar vazio — remova o item ou escreva um valor.");
      return;
    }
    const dup = cur.findIndex(
      (x, i) =>
        i !== idx &&
        String(x).trim().toLowerCase() === t.toLowerCase(),
    );
    if (dup >= 0) {
      toast.warning("Já existe um valor igual nesta lista.");
      return;
    }
    const oldVal = cur[idx];
    cur[idx] = t;
    const avField = avatarFieldForListKey(key);
    if (avField && String(oldVal) !== t) {
      setDraft((d) => {
        const nextAv = { ...(d[avField] || {}) };
        if (nextAv[String(oldVal)] != null) {
          nextAv[t] = nextAv[String(oldVal)];
          delete nextAv[String(oldVal)];
        }
        let tituloCor = d.titulo_cor_barra || {};
        let tituloImg = { ...(d.titulo_imagens_fundo || {}) };
        if (key === "titulo") {
          tituloCor = { ...tituloCor };
          if (tituloCor[String(oldVal)] != null) {
            tituloCor[t] = tituloCor[String(oldVal)];
            delete tituloCor[String(oldVal)];
          }
          if (Object.prototype.hasOwnProperty.call(tituloImg, String(oldVal))) {
            tituloImg[t] = tituloImg[String(oldVal)];
            delete tituloImg[String(oldVal)];
          }
        }
        return {
          ...d,
          [key]: cur,
          [avField]: nextAv,
          ...(key === "titulo"
            ? { titulo_cor_barra: tituloCor, titulo_imagens_fundo: tituloImg }
            : {}),
        };
      });
    } else if (key === "titulo" && String(oldVal) !== t) {
      setDraft((d) => {
        const tituloCor = { ...(d.titulo_cor_barra || {}) };
        if (tituloCor[String(oldVal)] != null) {
          tituloCor[t] = tituloCor[String(oldVal)];
          delete tituloCor[String(oldVal)];
        }
        const tituloImg = { ...(d.titulo_imagens_fundo || {}) };
        if (Object.prototype.hasOwnProperty.call(tituloImg, String(oldVal))) {
          tituloImg[t] = tituloImg[String(oldVal)];
          delete tituloImg[String(oldVal)];
        }
        return {
          ...d,
          [key]: cur,
          titulo_cor_barra: tituloCor,
          titulo_imagens_fundo: tituloImg,
        };
      });
    } else {
      setList(key, cur);
    }
    cancelEdit();
  };

  const sortListAz = (key) => {
    const cur = draft[key] || [];
    if (cur.length < 2) {
      toast.message("Adicione pelo menos dois itens para ordenar.");
      return;
    }
    setEditFocus(null);
    setEditBuffer("");
    setList(key, sortAlphabeticalPt(cur));
  };

  const restoreDefaults = () => {
    if (
      !window.confirm(
        "Repor todas as listas para os valores de fábrica? As alterações locais neste ecrã serão perdidas.",
      )
    ) {
      return;
    }
    setDraft(cloneLists(DEFAULT_AGENDA_SUGESTOES));
  };

  const renderCadastroListPanel = (key) => {
    const meta = AGENDA_SUGESTOES_FIELD_META[key];
    const items = draft[key] || [];
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">{meta.title}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {meta.description}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => sortListAz(key)}
            disabled={(draft[key] || []).length < 2}
          >
            <ArrowDownAZ className="h-4 w-4" />
            Ordenar A–Z
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor={`novo-${key}`} className="text-xs">
              Adicionar valor
            </Label>
            <Input
              id={`novo-${key}`}
              value={newLine[key]}
              onChange={(e) =>
                setNewLine((n) => ({ ...n, [key]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem(key);
                }
              }}
              placeholder={
                key === "categoria"
                  ? "ex.: culto, estudo, jovens…"
                  : key === "local"
                    ? "ex.: sede, auditório…"
                    : key === "horario"
                      ? "ex.: 19:45"
                      : "Nome ou texto"
              }
              className="h-10"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 gap-2 sm:mb-0.5"
            onClick={() => addItem(key)}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        <ul
          className={`mt-4 flex min-h-0 flex-col space-y-2 ${
            items.length > 0 ? "max-h-[min(52vh,28rem)] overflow-y-auto pr-1" : ""
          }`}
        >
          {items.length === 0 ? (
            <li className="flex min-h-[10rem] flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              Lista vazia — adicione valores acima.
            </li>
          ) : (
            items.map((item, idx) => {
              const isEditing = editFocus === `${key}:${idx}`;
              const rowAvatarField = avatarFieldForListKey(key);
              const rowAvatarUrl =
                rowAvatarField && draft[rowAvatarField]
                  ? draft[rowAvatarField][item]
                  : null;
              const rowAvatarBusy =
                avatarUploadingKey === `${key}:${String(item)}`;
              const tituloBarVal =
                key === "titulo"
                  ? (draft.titulo_cor_barra &&
                      draft.titulo_cor_barra[item]) ||
                    "auto"
                  : null;
              const tituloBarPresetOpt =
                key === "titulo" && tituloBarVal !== "auto"
                  ? EVENT_CARD_COLOR_OPTIONS.find(
                      (o) => o.value === tituloBarVal && o.tailwind,
                    )
                  : null;
              const tituloBgUrls =
                key === "titulo" &&
                Array.isArray(draft.titulo_imagens_fundo?.[item])
                  ? draft.titulo_imagens_fundo[item]
                  : [];
              const tituloBgBusy = tituloBgUploadingKey === String(item);
              return (
                <li
                  key={`${key}-${idx}-${String(item)}`}
                  className={cn(
                    "gap-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2",
                    key === "titulo" ? "flex flex-col" : "flex flex-wrap items-center",
                  )}
                >
                  {isEditing ? (
                    <>
                      <Input
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit(key, idx);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        className="min-h-10 min-w-0 flex-1"
                        autoFocus
                        aria-label={`Editar ${meta.title}`}
                      />
                      <Button
                        type="button"
                        variant="default"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        title="Guardar"
                        onClick={() => commitEdit(key, idx)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        title="Cancelar"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "flex flex-wrap items-center gap-2",
                          key === "titulo" ? "w-full" : "min-w-0 flex-1",
                        )}
                      >
                        {rowAvatarField ? (
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <label className="relative shrink-0 cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={rowAvatarBusy}
                                onChange={(e) => handleCadastroAvatarPick(key, item, e)}
                              />
                              <span
                                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-background"
                                title="Carregar foto"
                              >
                                {rowAvatarBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : rowAvatarUrl ? (
                                  <SafeImg
                                    src={rowAvatarUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                )}
                              </span>
                            </label>
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                              {item}
                            </span>
                            {rowAvatarUrl ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 shrink-0 text-xs text-muted-foreground"
                                onClick={() => clearCadastroAvatar(key, item)}
                              >
                                Limpar foto
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {item}
                          </span>
                        )}
                        {key === "titulo" && !isEditing ? (
                          <Popover
                            open={tituloCorPopoverOpen === `titulo:${idx}`}
                            onOpenChange={(next) =>
                              setTituloCorPopoverOpen(
                                next ? `titulo:${idx}` : null,
                              )
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="relative shrink-0 outline-none"
                                title="Cor da barra do cartão — clique para escolher"
                                aria-label={`Cor da barra do cartão para «${item}» — abrir opções`}
                                aria-expanded={
                                  tituloCorPopoverOpen === `titulo:${idx}`
                                }
                              >
                                {tituloBarVal === "auto" || !tituloBarPresetOpt ? (
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                                      "border-dashed border-muted-foreground/60 bg-muted/50 hover:bg-muted",
                                    )}
                                  >
                                    <span
                                      className="h-5 w-5 shrink-0 rounded-full border border-black/10 shadow-sm dark:border-white/15 bg-primary"
                                      aria-hidden
                                    />
                                  </span>
                                ) : (
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 rounded-full border-2 border-border shadow-sm ring-offset-background transition-all hover:ring-2 hover:ring-ring",
                                      tituloBarPresetOpt.tailwind,
                                    )}
                                    aria-hidden
                                  />
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-3"
                              align="end"
                              sideOffset={6}
                            >
                              <p className="mb-2 text-xs font-medium text-foreground">
                                Cor da barra do card
                              </p>
                              <div
                                className="flex max-w-[11.5rem] flex-wrap gap-2"
                                role="group"
                                aria-label="Escolher cor da barra"
                              >
                                <button
                                  type="button"
                                  title="Igual à categoria"
                                  aria-label="Igual à categoria"
                                  aria-pressed={tituloBarVal === "auto"}
                                  onClick={() => {
                                    setDraft((d) => ({
                                      ...d,
                                      titulo_cor_barra: {
                                        ...(d.titulo_cor_barra || {}),
                                        [item]: "auto",
                                      },
                                    }));
                                    setTituloCorPopoverOpen(null);
                                  }}
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                    tituloBarVal === "auto"
                                      ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
                                      : "border-dashed border-muted-foreground/60 bg-muted/50 hover:bg-muted",
                                  )}
                                >
                                  <span
                                    className="h-5 w-5 shrink-0 rounded-full border border-black/10 shadow-sm dark:border-white/15 bg-primary"
                                    aria-hidden
                                  />
                                </button>
                                {EVENT_CARD_COLOR_OPTIONS.filter(
                                  (o) => o.tailwind,
                                ).map((o) => {
                                  const selected = tituloBarVal === o.value;
                                  return (
                                    <button
                                      key={o.value}
                                      type="button"
                                      title={o.label}
                                      aria-label={o.label}
                                      aria-pressed={selected}
                                      onClick={() => {
                                        setDraft((d) => ({
                                          ...d,
                                          titulo_cor_barra: {
                                            ...(d.titulo_cor_barra || {}),
                                            [item]: o.value,
                                          },
                                        }));
                                        setTituloCorPopoverOpen(null);
                                      }}
                                      className={cn(
                                        "h-8 w-8 shrink-0 rounded-full border-2 border-transparent shadow-sm transition-all",
                                        o.tailwind,
                                        selected &&
                                          "z-10 scale-105 ring-2 ring-foreground ring-offset-2 ring-offset-background",
                                      )}
                                    />
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Editar"
                          title="Editar"
                          onClick={() => beginEdit(key, idx, item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label="Remover"
                          onClick={() => removeAt(key, idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {key === "titulo" && !isEditing ? (
                        <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/50 pt-2">
                          <span className="w-full text-[11px] font-medium text-muted-foreground">
                            Fundo do cartão (quando o evento não tem imagem própria)
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {tituloBgUrls.map((url, ui) => (
                              <span
                                key={`${url}-${ui}`}
                                className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-background"
                              >
                                <SafeImg
                                  src={url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                                <button
                                  type="button"
                                  title="Remover imagem"
                                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => removeTituloFundoAt(item, ui)}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                            <label
                              className={cn(
                                "flex h-11 w-16 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/50 bg-muted/30 transition-colors hover:bg-muted/50",
                                tituloBgBusy && "pointer-events-none opacity-60",
                              )}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={
                                  tituloBgBusy ||
                                  tituloBgUrls.length >= MAX_TITULO_BG_IMAGES
                                }
                                onChange={(e) => handleTituloFundoPick(item, e)}
                              />
                              {tituloBgBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                              )}
                            </label>
                          </div>
                          {tituloBgUrls.length >= MAX_TITULO_BG_IMAGES ? (
                            <span className="w-full text-[11px] text-muted-foreground">
                              Limite de {MAX_TITULO_BG_IMAGES} imagens atingido.
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </motion.div>
    );
  };

  if (isLoading && !publicWs) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
        A carregar listas…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <BookMarked className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Padrão
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Listas e opções predefinidas nos formulários de eventos e na agenda simples.
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab);
          cancelEdit();
          setTituloCorPopoverOpen(null);
        }}
        className="w-full"
      >
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          {AGENDA_SUGESTOES_KEYS.map((key) => (
            <TabsTrigger key={key} value={key} className="px-3 py-1.5 text-xs sm:text-sm">
              {AGENDA_SUGESTOES_FIELD_META[key].tabLabel ||
                AGENDA_SUGESTOES_FIELD_META[key].title}
            </TabsTrigger>
          ))}
          <TabsTrigger value="agenda-simple" className="px-3 py-1.5 text-xs sm:text-sm">
            Agenda simples
          </TabsTrigger>
        </TabsList>

        {AGENDA_SUGESTOES_KEYS.map((key) => (
          <TabsContent
            key={key}
            value={key}
            className="mt-0 focus-visible:outline-none"
          >
            {renderCadastroListPanel(key)}
          </TabsContent>
        ))}

        <TabsContent
          value="agenda-simple"
          className="mt-0 focus-visible:outline-none"
        >
          <AdminAgendaSimpleGridSection />
        </TabsContent>
      </Tabs>

      {activeTab !== "agenda-simple" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={restoreDefaults}
            disabled={mutation.isPending}
          >
            Repor padrões de fábrica
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate(draft)}
            disabled={!dirty || mutation.isPending}
            className="gap-2 sm:ml-auto"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? "A guardar…" : "Guardar alterações"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

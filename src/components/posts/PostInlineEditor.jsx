import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseISO, isValid } from "date-fns";
import { Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { PostMedia } from "@/components/posts/PostMedia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import {
  POST_CATEGORIAS,
  normalizeStoredPostCategoria,
} from "@/lib/postCategories";
import {
  appendYoutubeSlidesFromUrls,
  buildSlidesFromAnexos,
  collectPostFeaturedEligibleUrls,
  dedupeTagsPreserveOrder,
  normalizePost,
  normalizeTagKey,
  normalizeVideoUrlsFromPost,
} from "@/lib/posts";
import { uploadIntegrationFile } from "@/lib/uploadImage";
import { cn } from "@/lib/utils";

const pad2 = (n) => String(n).padStart(2, "0");

function postDateToInputValue(iso) {
  if (!iso) return "";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  } catch {
    return "";
  }
}

function postDateInputToIso(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, mo - 1, day, 12, 0, 0, 0);
  if (!isValid(d)) return null;
  return d.toISOString();
}

function buildDraftFromPost(post) {
  const p = normalizePost(post);
  return {
    titulo: String(p.titulo || ""),
    descricao: String(p.descricao || ""),
    conteudo: String(p.conteudo || ""),
    dataPublicacao: postDateToInputValue(p.data_publicacao),
    categoria: normalizeStoredPostCategoria(p.categoria),
    tags: Array.isArray(p.tags) ? [...p.tags] : [],
    anexos: Array.isArray(p.anexos) ? p.anexos.map((a) => ({ ...a })) : [],
    imagemDestaqueUrl: String(p.imagem_destaque_url || "").trim(),
    video_urls: normalizeVideoUrlsFromPost(p).length
      ? normalizeVideoUrlsFromPost(p)
      : [""],
    carousel_interval_sec: p.carousel_interval_sec,
    usar_galeria_por_dia: Boolean(p.usar_galeria_por_dia),
    dias_galeria: Array.isArray(p.dias_galeria) ? p.dias_galeria : [],
    audio_ambiente_url: String(p.audio_ambiente_url ?? "").trim(),
    audio_ambiente_escopo: p.audio_ambiente_escopo,
    status: p.status === "draft" || p.is_draft ? "draft" : "published",
    visibility: p.visibility || "public",
    autor: p.autor || "",
  };
}

export default function PostInlineEditor({
  post,
  postId,
  returnPath,
  onCancel,
  onSaved,
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => buildDraftFromPost(post));
  const [tagDraft, setTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(buildDraftFromPost(post));
    setTagDraft("");
    setError("");
  }, [post?.id, post?.updated_date]);

  const setField = useCallback((key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addTag = () => {
    const raw = String(tagDraft || "").replace(/,+$/, "").trim();
    if (!raw) return;
    setDraft((prev) => ({
      ...prev,
      tags: dedupeTagsPreserveOrder([...(prev.tags || []), raw]),
    }));
    setTagDraft("");
  };

  const removeTagAt = (idx) => {
    setDraft((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== idx),
    }));
  };

  const removeAnexoByUrl = useCallback((url) => {
    const u = String(url || "").trim();
    if (!u) return;
    setDraft((prev) => ({
      ...prev,
      imagemDestaqueUrl: prev.imagemDestaqueUrl === u ? "" : prev.imagemDestaqueUrl,
      anexos: (prev.anexos || []).filter((a) => a?.url !== u),
    }));
  }, []);

  const removeGallerySlideAt = useCallback(
    (slideIndex) => {
      const yt = (draft.video_urls || [])
        .map((s) => String(s || "").trim())
        .filter(Boolean);
      const slides = appendYoutubeSlidesFromUrls(
        buildSlidesFromAnexos(draft.anexos),
        yt,
      );
      const slide = slides[slideIndex];
      if (!slide) return;
      if (slide.kind === "youtube") {
        const target = String(slide.url || "").trim();
        setDraft((prev) => {
          const next = (prev.video_urls || []).filter(
            (u) => String(u).trim() !== target,
          );
          return {
            ...prev,
            video_urls: next.length ? next : [""],
          };
        });
        return;
      }
      removeAnexoByUrl(slide.url);
    },
    [draft.anexos, draft.video_urls, removeAnexoByUrl],
  );

  const handleUploadMedia = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError("");
    setUploading(true);
    setUploadProgress(0);
    try {
      const next = [...(draft.anexos || [])];
      const total = files.length;
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const mime = String(file?.type || "");
        if (
          !mime.startsWith("image/") &&
          !mime.startsWith("video/") &&
          !mime.startsWith("audio/")
        ) {
          throw new Error("Envie imagens, vídeos ou áudio.");
        }
        const purpose = mime.startsWith("audio/") ? "post_audio" : "post_media";
        const { file_url } = await uploadIntegrationFile(file, {
          purpose,
          onProgress: (pct) => {
            const overall = Math.round(((i + pct / 100) / total) * 100);
            setUploadProgress(Math.min(100, overall));
          },
        });
        if (file_url) {
          next.push({
            url: file_url,
            name: file?.name || "",
            mime: file?.type || "",
            size: Number(file?.size) || 0,
          });
        }
      }
      setDraft((prev) => ({ ...prev, anexos: next }));
      setUploadProgress(100);
    } catch (err) {
      setError(err?.message || "Não foi possível enviar os ficheiros.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const titulo = String(draft.titulo || "").trim();
      const descricao = String(draft.descricao || "").trim();
      if (!titulo) throw new Error("O título é obrigatório.");
      if (!descricao) throw new Error("A descrição é obrigatória.");
      const dataIso = postDateInputToIso(draft.dataPublicacao);
      if (!dataIso) throw new Error("Data de publicação inválida.");

      const eligible = collectPostFeaturedEligibleUrls({ anexos: draft.anexos });
      let featured = String(draft.imagemDestaqueUrl || "").trim();
      if (featured && !eligible.includes(featured)) featured = "";

      const r = await fetch(`/api/data/posts/${postId}`, {
        method: "PUT",
        credentials: "include",
        headers: await withCsrfHeaderAsync({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          titulo,
          descricao,
          conteudo: String(draft.conteudo || "").trim(),
          categoria: normalizeStoredPostCategoria(draft.categoria),
          anexos: draft.anexos || [],
          video_urls: (draft.video_urls || [])
            .map((u) => String(u || "").trim())
            .filter(Boolean),
          video_url: String((draft.video_urls || []).find(Boolean) || "").trim(),
          data_publicacao: dataIso,
          carousel_interval_sec: draft.carousel_interval_sec,
          tags: dedupeTagsPreserveOrder(draft.tags),
          autor: draft.autor || "",
          imagem_destaque_url: featured,
          usar_galeria_por_dia: Boolean(draft.usar_galeria_por_dia),
          dias_galeria: Array.isArray(draft.dias_galeria)
            ? draft.dias_galeria
            : [],
          audio_ambiente_url: String(draft.audio_ambiente_url ?? "").trim(),
          audio_ambiente_escopo:
            draft.audio_ambiente_escopo === "por_secao"
              ? "por_secao"
              : "todas_secoes",
          status: draft.status,
          visibility: draft.visibility,
        }),
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        throw new Error(parsed?.message || "Não foi possível guardar o post.");
      }
      return parsed;
    },
    onSuccess: () => {
      toast.success("Publicação actualizada.");
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      onSaved?.();
    },
    onError: (err) => {
      setError(err?.message || "Não foi possível guardar.");
    },
  });

  const mediaEditable = !draft.usar_galeria_por_dia;
  const hasMedia =
    (draft.anexos || []).length > 0 ||
    (draft.video_urls || []).some((u) => String(u || "").trim());

  const galleryAdmin = useMemo(() => {
    if (!mediaEditable) return null;
    return {
      anexos: draft.anexos || [],
      onReorderAnexos: (next) => setField("anexos", next),
      imagemDestaqueUrl: draft.imagemDestaqueUrl,
      onImagemDestaqueChange: (url) => setField("imagemDestaqueUrl", url),
    };
  }, [draft.anexos, draft.imagemDestaqueUrl, mediaEditable, setField]);

  return (
    <div className="space-y-6 rounded-2xl border border-white/[0.08] bg-[#08111F]/40 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[#94A3B8]">
          Edição rápida — campo a campo
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
            asChild
          >
            <Link
              to={`/Posts/editar/${postId}`}
              state={returnPath ? { from: returnPath } : undefined}
            >
              Editor completo
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-white/[0.08] bg-transparent text-xs"
            onClick={onCancel}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "A guardar…" : "Guardar"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="inline-post-titulo" className="text-[#94A3B8]">
            Título
          </Label>
          <Input
            id="inline-post-titulo"
            value={draft.titulo}
            onChange={(e) => setField("titulo", e.target.value)}
            className="border-white/[0.08] bg-[#08111F]/60"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inline-post-descricao" className="text-[#94A3B8]">
            Descrição
          </Label>
          <Textarea
            id="inline-post-descricao"
            value={draft.descricao}
            onChange={(e) => setField("descricao", e.target.value)}
            className="min-h-[88px] resize-y border-white/[0.08] bg-[#08111F]/60"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inline-post-conteudo" className="text-[#94A3B8]">
            Conteúdo
          </Label>
          <Textarea
            id="inline-post-conteudo"
            value={draft.conteudo}
            onChange={(e) => setField("conteudo", e.target.value)}
            placeholder="Texto complementar (opcional)"
            className="min-h-[120px] resize-y border-white/[0.08] bg-[#08111F]/60 font-mono text-sm"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inline-post-data" className="text-[#94A3B8]">
              Data da publicação
            </Label>
            <Input
              id="inline-post-data"
              type="date"
              value={draft.dataPublicacao}
              onChange={(e) => setField("dataPublicacao", e.target.value)}
              className="border-white/[0.08] bg-[#08111F]/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inline-post-categoria" className="text-[#94A3B8]">
              Categoria
            </Label>
            <Select
              value={draft.categoria || "__none__"}
              onValueChange={(value) =>
                setField("categoria", value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger
                id="inline-post-categoria"
                className="border-white/[0.08] bg-[#08111F]/60"
              >
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {POST_CATEGORIAS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Tags</Label>
          <div className="flex flex-wrap gap-2">
            {(draft.tags || []).map((tag, idx) => (
              <Badge
                key={`${normalizeTagKey(tag)}-${idx}`}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {tag}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-white/10"
                  aria-label={`Remover tag ${tag}`}
                  onClick={() => removeTagAt(idx)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Nova tag"
              className="border-white/[0.08] bg-[#08111F]/60"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-white/[0.08]"
              onClick={addTag}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-t border-white/[0.06] pt-5">
          <Label className="text-[#94A3B8]">Multimídia</Label>

          {draft.usar_galeria_por_dia ? (
            <p className="text-sm text-[#64748B]">
              Esta publicação usa galeria por secções. Para alterar imagens,
              use o{" "}
              <Link
                to={`/Posts/editar/${postId}`}
                state={returnPath ? { from: returnPath } : undefined}
                className="text-[#93C5FD] hover:underline"
              >
                editor completo
              </Link>
              .
            </p>
          ) : (
            <>
              <label
                className={cn(
                  "inline-flex min-h-[2.75rem] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.12] bg-[#08111F]/50 px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-[#38BDF8]/40 hover:text-[#F8FAFC]",
                  uploading && "pointer-events-none opacity-60",
                )}
              >
                <Upload className="h-4 w-4 shrink-0" />
                Adicionar imagens, vídeos ou áudio
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={handleUploadMedia}
                />
              </label>
              {uploading ? (
                <div className="space-y-1">
                  <Progress value={uploadProgress} className="h-1.5" />
                  <p className="text-xs text-[#64748B]">A enviar… {uploadProgress}%</p>
                </div>
              ) : null}

              {hasMedia || galleryAdmin ? (
                <PostMedia
                  anexos={draft.anexos}
                  video_url={String((draft.video_urls || []).find(Boolean) || "")}
                  video_urls={draft.video_urls}
                  intervalSec={draft.carousel_interval_sec}
                  showPresentationButton
                  audioAmbienteUrl={draft.audio_ambiente_url}
                  audioAmbienteEscopo={draft.audio_ambiente_escopo}
                  galleryAdmin={galleryAdmin}
                  onRemoveGallerySlide={removeGallerySlideAt}
                />
              ) : (
                <p className="text-sm text-[#64748B]">
                  Sem ficheiros — use o botão acima para adicionar.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

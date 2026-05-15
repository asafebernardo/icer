import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  BookOpen,
  User,
  Calendar,
  Search,
  Tag,
  Images,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Video,
  Clock,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import ConfirmDialog from "../components/shared/ConfirmDialog";

import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { uploadIntegrationFile } from "@/lib/uploadImage";

function getYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return m ? m[1] : null;
}

function normalizePost(post) {
  const imagens_urls = Array.isArray(post.imagens_urls)
    ? post.imagens_urls.filter(Boolean)
    : post.imagem_url
      ? [post.imagem_url]
      : [];
  const anexos = Array.isArray(post.anexos)
    ? post.anexos.filter(Boolean)
    : Array.isArray(post.attachments)
      ? post.attachments.filter(Boolean)
      : [];
  const video_url = post.video_url || "";
  const tags =
    Array.isArray(post.tags) && post.tags.length
      ? post.tags.filter(Boolean).map((t) => String(t))
      : post.tag != null && String(post.tag).trim()
        ? [String(post.tag)]
        : [];
  const tipo =
    post.tipo_conteudo === "video" || post.tipo_conteudo === "imagens"
      ? post.tipo_conteudo
      : video_url && !imagens_urls.length
        ? "video"
        : imagens_urls.length
          ? "imagens"
          : "imagens";
  return {
    ...post,
    titulo: post.titulo || "",
    descricao: post.descricao || post.resumo || "",
    imagens_urls,
    anexos,
    video_url,
    tipo_conteudo: tipo,
    data_publicacao: post.data_publicacao || post.created_date,
    tags,
    carousel_interval_sec: Math.min(
      60,
      Math.max(2, Number(post.carousel_interval_sec) || 5),
    ),
    autor: post.autor || "",
  };
}

function normalizeTagKey(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function dedupeTagsPreserveOrder(list) {
  const seen = new Set();
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    const label = String(t || "").trim();
    if (!label) continue;
    const key = normalizeTagKey(label);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
function formatPubDate(iso) {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function isImageMime(mime) {
  return typeof mime === "string" && mime.startsWith("image/");
}
function isVideoMime(mime) {
  return typeof mime === "string" && mime.startsWith("video/");
}
function isAudioMime(mime) {
  return typeof mime === "string" && mime.startsWith("audio/");
}

/** Carrossel com intervalo controlável (segundos). */
function ImageCarousel({ urls, intervalSec, showControls = true }) {
  const [index, setIndex] = useState(0);
  const [delay, setDelay] = useState(() =>
    Math.min(60, Math.max(2, Number(intervalSec) || 5)),
  );

  useEffect(() => {
    setDelay(Math.min(60, Math.max(2, Number(intervalSec) || 5)));
  }, [intervalSec]);

  useEffect(() => {
    if (!urls?.length) return;
    if (urls.length <= 1) return;
    const ms = delay * 1000;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % urls.length);
    }, ms);
    return () => clearInterval(t);
  }, [urls, delay]);

  useEffect(() => {
    setIndex((i) => (urls?.length ? Math.min(i, urls.length - 1) : 0));
  }, [urls]);

  if (!urls?.length) {
    return (
      <div className="aspect-video rounded-xl bg-muted flex items-center justify-center">
        <Images className="w-12 h-12 text-muted-foreground/55" />
      </div>
    );
  }

  const safeIndex = Math.min(index, urls.length - 1);
  const go = (dir) => {
    setIndex((i) => {
      const n = urls.length;
      if (dir < 0) return (i - 1 + n) % n;
      return (i + 1) % n;
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/5 border border-border">
        <img
          src={urls[safeIndex]}
          alt=""
          className="w-full h-full object-contain bg-black/80"
        />
        {urls.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border shadow flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => go(-1)}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Seguinte"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border shadow flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => go(1)}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {urls.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Imagem ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === safeIndex ? "w-6 bg-accent" : "w-2 bg-background/70"}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {showControls && urls.length > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <Clock className="w-4 h-4" />
            <span>Tempo entre imagens: {delay}s</span>
          </div>
          <Slider
            value={[delay]}
            onValueChange={(v) => setDelay(v[0])}
            min={2}
            max={20}
            step={1}
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
}

function MediaPreview({ anexos, intervalSec }) {
  const items = Array.isArray(anexos) ? anexos : [];
  const images = items
    .map((a) => (a && a.url && isImageMime(a.mime) ? a.url : null))
    .filter(Boolean);
  if (images.length >= 4) {
    const show = images.slice(0, 16);
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden border border-border bg-muted/10">
          {show.map((src, i) => (
            <div key={`${src}-${i}`} className="aspect-square bg-muted/30">
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        {images.length > 16 ? (
          <p className="text-xs text-muted-foreground">
            +{images.length - 16} imagem(ns)
          </p>
        ) : null}
        <ImageCarousel
          key={images.join("|")}
          urls={images}
          intervalSec={intervalSec}
          showControls={images.length > 1}
        />
      </div>
    );
  }
  if (images.length > 0) {
    return (
      <ImageCarousel
        key={images.join("|")}
        urls={images}
        intervalSec={intervalSec}
        showControls={images.length > 1}
      />
    );
  }
  const first = items.find((a) => a && a.url);
  if (first?.url && isVideoMime(first.mime)) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden border bg-black">
        <video src={first.url} className="w-full h-full" controls />
      </div>
    );
  }
  if (first?.url && isAudioMime(first.mime)) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <audio src={first.url} controls className="w-full" />
      </div>
    );
  }
  if (items.length > 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground mb-2">Anexos</p>
        <ul className="space-y-2">
          {items.map((a, i) => (
            <li key={`${a?.url || "file"}-${i}`} className="text-sm">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline break-all"
              >
                {a.name || `Arquivo ${i + 1}`}
              </a>
              {a.mime ? (
                <span className="text-xs text-muted-foreground ml-2">
                  {a.mime}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}

function PostPreviewThumb({ post }) {
  const p = normalizePost(post);
  if (p.tipo_conteudo === "video" && p.video_url) {
    const id = getYouTubeId(p.video_url);
    if (id) {
      return (
        <img
          src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
          alt=""
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-primary/10">
        <Video className="w-10 h-10 text-primary/50" />
      </div>
    );
  }
  if (p.imagens_urls[0]) {
    return (
      <img
        src={p.imagens_urls[0]}
        alt=""
        className="w-full h-full object-cover"
      />
    );
  }
  if (Array.isArray(p.anexos) && p.anexos.length > 0) {
    const firstImg = p.anexos.find((a) => a && isImageMime(a.mime) && a.url);
    if (firstImg?.url) {
      return (
        <img
          src={firstImg.url}
          alt=""
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <BookOpen className="w-10 h-10 text-muted-foreground/55" />
      </div>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <BookOpen className="w-10 h-10 text-muted-foreground/55" />
    </div>
  );
}

function PostFormDialog({ open, onOpenChange, onSave, autorEmail, editingPost }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState([]);
  const [video_url, setVideoUrl] = useState("");
  const [dataPublicacao, setDataPublicacao] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );
  const [carousel_interval_sec, setCarouselInterval] = useState(5);
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [editingTagIdx, setEditingTagIdx] = useState(-1);
  const [editingTagDraft, setEditingTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setTitulo("");
    setDescricao("");
    setAnexos([]);
    setVideoUrl("");
    setDataPublicacao(toDatetimeLocalValue(new Date().toISOString()));
    setCarouselInterval(5);
    setTags([]);
    setTagDraft("");
    setEditingTagIdx(-1);
    setEditingTagDraft("");
    setError("");
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editingPost) {
      const p = normalizePost(editingPost);
      setTitulo(p.titulo);
      setDescricao(p.descricao);
      setAnexos([...(p.anexos || [])]);
      setVideoUrl(p.video_url || "");
      setDataPublicacao(toDatetimeLocalValue(p.data_publicacao));
      setCarouselInterval(p.carousel_interval_sec);
      setTags(dedupeTagsPreserveOrder(p.tags || []));
      setTagDraft("");
      setEditingTagIdx(-1);
      setEditingTagDraft("");
      setError("");
    } else {
      reset();
    }
  }, [open, editingPost, reset]);

  const addTagFromDraft = () => {
    const raw = String(tagDraft || "").replace(/,+$/, "").trim();
    if (!raw) return;
    setTags((cur) => dedupeTagsPreserveOrder([...(cur || []), raw]));
    setTagDraft("");
  };

  const removeTagAt = (idx) => {
    setTags((cur) => (Array.isArray(cur) ? cur.filter((_, i) => i !== idx) : []));
    if (editingTagIdx === idx) {
      setEditingTagIdx(-1);
      setEditingTagDraft("");
    }
  };

  const startEditTag = (idx) => {
    const cur = tags[idx];
    if (cur == null) return;
    setEditingTagIdx(idx);
    setEditingTagDraft(String(cur));
  };

  const commitEditTag = () => {
    if (editingTagIdx < 0) return;
    const raw = String(editingTagDraft || "").replace(/,+$/, "").trim();
    const idx = editingTagIdx;
    setEditingTagIdx(-1);
    setEditingTagDraft("");
    if (!raw) {
      removeTagAt(idx);
      return;
    }
    setTags((cur) => {
      const list = Array.isArray(cur) ? [...cur] : [];
      list[idx] = raw;
      return dedupeTagsPreserveOrder(list);
    });
  };

  const handleAddMedia = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const next = [...anexos];
      for (const file of files) {
        const mime = String(file?.type || "");
        const isVisual = mime.startsWith("image/") || mime.startsWith("video/");
        if (!isVisual) {
          throw new Error(
            "Em postagens, só é permitido enviar imagens e vídeos.",
          );
        }
        const { file_url } = await uploadIntegrationFile(file, { purpose: "post_media" });
        if (file_url) {
          next.push({
            url: file_url,
            name: file?.name || "",
            mime: file?.type || "",
            size: Number(file?.size) || 0,
          });
        }
      }
      setAnexos(next);
    } catch (err) {
      setError(
        err?.message ||
          "Não foi possível enviar um ou mais ficheiros. Tente novamente.",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = () => {
    setError("");
    if (!titulo.trim()) {
      setError("O título é obrigatório.");
      return;
    }
    if (!descricao.trim()) {
      setError("A descrição é obrigatória.");
      return;
    }
    if (!dataPublicacao) {
      setError("A data da publicação é obrigatória.");
      return;
    }
    const pubDate = new Date(dataPublicacao);
    if (!isValid(pubDate)) {
      setError("Data da publicação inválida.");
      return;
    }
    const pubIso = pubDate.toISOString();
    const hasAttachments = Array.isArray(anexos) && anexos.length > 0;
    const hasVideoUrl = Boolean(video_url && video_url.trim());
    if (!hasAttachments && !hasVideoUrl) {
      setError("Adicione pelo menos um arquivo ou informe um URL de vídeo.");
      return;
    }
    if (hasVideoUrl) {
      const trimmed = video_url.trim();
      try {
        const u = new URL(trimmed);
        if (!(u.protocol === "http:" || u.protocol === "https:")) {
          setError("Indique um URL válido (http/https).");
          return;
        }
      } catch {
        setError("Indique um URL válido (http/https).");
        return;
      }
    }

    onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      anexos,
      video_url: video_url.trim(),
      data_publicacao: pubIso,
      carousel_interval_sec:
        Math.min(60, Math.max(2, Number(carousel_interval_sec) || 5)),
      tags: dedupeTagsPreserveOrder(tags),
      autor: autorEmail || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPost ? "Editar post" : "Novo post"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="post-titulo">Título *</Label>
            <Input
              id="post-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da publicação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-desc">Descrição *</Label>
            <Textarea
              id="post-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Texto da publicação"
              className="min-h-[100px] resize-y"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Arquivos (apenas imagens e vídeos)</Label>
              <label
                className={`flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-xl p-4 hover:border-accent/50 ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "A enviar…" : "Clique para escolher ficheiros"}
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleAddMedia}
                />
              </label>
              {anexos.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive -mt-1"
                  onClick={() => setAnexos([])}
                >
                  Remover todos os arquivos
                </Button>
              ) : null}
            </div>
              {anexos.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {anexos.length}{" "}
                    {anexos.length === 1 ? "arquivo enviado" : "arquivos enviados"}
                  </p>
                  <details className="group text-sm">
                    <summary className="cursor-pointer text-accent hover:underline list-none [&::-webkit-details-marker]:hidden">
                      Gerir lista — remover arquivos
                    </summary>
                    <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background divide-y">
                      {anexos.map((a, i) => (
                        <li
                          key={`${a?.url || "file"}-${i}`}
                          className="flex items-center justify-between gap-2 px-2 py-1.5"
                        >
                          <span className="text-muted-foreground truncate min-w-0">
                            {a?.name || `Arquivo ${i + 1}`}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/15"
                            onClick={() =>
                              setAnexos((arr) => arr.filter((_, j) => j !== i))
                            }
                            aria-label={`Remover arquivo ${i + 1}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
              <div className="space-y-2">
                <Label>Intervalo do carrossel (s)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[carousel_interval_sec]}
                    onValueChange={(v) => setCarouselInterval(v[0])}
                    min={2}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm tabular-nums w-10">
                    {carousel_interval_sec}s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Usado quando houver múltiplas imagens anexadas.
                </p>
              </div>

            <div className="space-y-2">
              <Label htmlFor="post-video">URL de vídeo (opcional)</Label>
              <Input
                id="post-video"
                value={video_url}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>

            {(() => {
              const imgs = anexos.filter((a) => a && isImageMime(a.mime) && a.url).map((a) => a.url);
              if (imgs.length === 0) return null;
              return (
                <div className="space-y-2">
                  <Label>Pré-visualização das imagens</Label>
                  <ImageCarousel
                    urls={imgs}
                    intervalSec={carousel_interval_sec}
                    showControls={imgs.length > 1}
                  />
                </div>
              );
            })()}

          </div>

          <div className="space-y-2">
            <Label htmlFor="post-data">Data da publicação *</Label>
            <Input
              id="post-data"
              type="datetime-local"
              value={dataPublicacao}
              onChange={(e) => setDataPublicacao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags (opcional)</Label>
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="Digite e pressione Enter ou vírgula…"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTagFromDraft();
                }
                if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
                  removeTagAt(tags.length - 1);
                }
              }}
              onBlur={() => addTagFromDraft()}
            />
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((t, idx) => {
                  const isEditing = editingTagIdx === idx;
                  return (
                    <span
                      key={`${normalizeTagKey(t)}-${idx}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1"
                    >
                      {isEditing ? (
                        <input
                          value={editingTagDraft}
                          onChange={(e) => setEditingTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              commitEditTag();
                            }
                            if (e.key === "Escape") {
                              setEditingTagIdx(-1);
                              setEditingTagDraft("");
                            }
                          }}
                          onBlur={commitEditTag}
                          className="bg-transparent outline-none text-sm min-w-[6rem]"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditTag(idx)}
                          className="text-sm text-foreground hover:underline underline-offset-2"
                          title="Clique para editar"
                        >
                          {t}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTagAt(idx)}
                        className="w-5 h-5 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-destructive/10"
                        aria-label="Remover tag"
                        title="Remover"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="success"
            onClick={handleSubmit}
            disabled={uploading}
          >
            {editingPost ? "Salvar" : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PostDetailModal({
  post,
  open,
  onOpenChange,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  const p = useMemo(() => (post ? normalizePost(post) : null), [post]);

  if (!p) return null;

  const yt = p.video_url ? getYouTubeId(p.video_url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap gap-2 mb-1">
            {(p.tags || []).map((t) => (
              <Badge key={normalizeTagKey(t)} variant="secondary" className="gap-1">
                <Tag className="w-3 h-3" />
                {t}
              </Badge>
            ))}
          </div>
          <DialogTitle className="text-left font-display text-xl sm:text-2xl pr-8">
            {p.titulo}
          </DialogTitle>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pt-1">
            {p.autor ? (
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {p.autor}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatPubDate(p.data_publicacao)}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {p.video_url ? (
            yt ? (
              <div className="aspect-video rounded-xl overflow-hidden border bg-black">
                <iframe
                  title={p.titulo}
                  src={`https://www.youtube.com/embed/${yt}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={p.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-accent"
              >
                Abrir vídeo <ExternalLink className="w-4 h-4" />
              </a>
            )
          ) : (
            <MediaPreview anexos={p.anexos} intervalSec={p.carousel_interval_sec} />
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">
              {p.descricao}
            </p>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            {canEdit ? (
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() => {
                  onEdit(post);
                  onOpenChange(false);
                }}
              >
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
            ) : (
              <span />
            )}
            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                onClick={() => onDelete(p.id)}
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </Button>
            ) : null}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Postagens() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user: authUser, checkUserAuth } = useAuth();

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  const sessionUser = authUser ?? getUser();
  const canCreate = canMenuAction(sessionUser, MENU.POSTAGENS, "create");
  const canEdit = canMenuAction(sessionUser, MENU.POSTAGENS, "edit");
  const canDelete = canMenuAction(sessionUser, MENU.POSTAGENS, "delete");
  const autorEmail = sessionUser?.email || "";

  const PAGE_SIZE = 12;
  const sortParam = sortOrder === "asc" ? "data" : "-data";

  const { data, isLoading } = useQuery({
    queryKey: ["posts", page, sortOrder],
    queryFn: async () => {
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        skip: String(page * PAGE_SIZE),
        sort: sortParam,
      });
      const r = await fetch(`/api/data/posts?${qs.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error("Não foi possível carregar posts.");
      return r.json();
    },
  });
  const posts = Array.isArray(data?.items) ? data.items : [];
  const total = Number(data?.total) || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    // Se mudar ordenação ou pesquisa, volta para a primeira página.
    setPage(0);
  }, [sortOrder]);

  const createPost = useMutation({
    mutationFn: async (data) => {
      const r = await fetch("/api/data/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        const msg = parsed?.message || "Não foi possível criar o post.";
        throw new Error(msg);
      }
      return parsed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setShowForm(false);
      setEditingPost(null);
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const r = await fetch(`/api/data/posts/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        const msg = parsed?.message || "Não foi possível atualizar o post.";
        throw new Error(msg);
      }
      return parsed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setShowForm(false);
      setEditingPost(null);
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/data/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok && r.status !== 204) {
        const text = await r.text();
        let parsed = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = null;
        }
        throw new Error(parsed?.message || "Não foi possível eliminar o post.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const q = search.trim().toLowerCase();
  const filteredSorted = useMemo(() => {
    const filtered = posts.filter((raw) => {
      if (!q) return true;
      const p = normalizePost(raw);
      const hay = [
        p.titulo,
        p.descricao,
        (p.tags || []).join(" "),
        p.autor,
        p.video_url,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    // A ordenação principal já vem do servidor. Aqui só mantemos ordem estável no filtro local.
    return filtered;
  }, [posts, q, sortOrder]);

  return (
    <div>
      <PageHeader
        pageKey="postagens"
        tag="Comunidade"
        title="Postagens"
        description="Notícias, avisos e reflexões da comunidade para acompanhar a vida da igreja."
      />

      <section className="py-16 max-w-5xl mx-auto px-4">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-end mb-6">
          {canCreate ? (
            <Button
              onClick={() => {
                setEditingPost(null);
                setShowForm(true);
              }}
              className="w-fit gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo post
            </Button>
          ) : null}
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <p className="text-xs text-muted-foreground">
            {total ? `${total} publicação(ões)` : "—"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Página {Math.min(page + 1, totalPages)} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end mb-8">
          <div className="flex-1 space-y-2">
            <Label htmlFor="busca-posts" className="text-muted-foreground">
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="busca-posts"
                placeholder="Título, descrição, tag, autor ou URL…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-full sm:w-56 space-y-2">
            <Label className="text-muted-foreground">Ordenar por data</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger aria-label="Ordenar publicações por data">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Decrescente (mais recente)</SelectItem>
                <SelectItem value="asc">Crescente (mais antiga)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <PostFormDialog
          open={showForm}
          onOpenChange={(o) => {
            setShowForm(o);
            if (!o) setEditingPost(null);
          }}
          editingPost={editingPost}
          onSave={(data) => {
            if (editingPost?.id != null) {
              updatePost.mutate({ id: editingPost.id, ...data });
            } else {
              createPost.mutate(data);
            }
          }}
          autorEmail={autorEmail}
        />

        <ConfirmDialog
          open={pendingDeleteId != null}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteId(null);
          }}
          title="Eliminar esta publicação?"
          description="Esta ação não pode ser desfeita."
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={() => {
            if (pendingDeleteId != null) {
              deletePost.mutate(pendingDeleteId);
            }
          }}
        />

        {isLoading ? (
          <p className="text-muted-foreground">A carregar…</p>
        ) : filteredSorted.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum post"
            description={
              q
                ? "Nenhum resultado para a sua pesquisa."
                : "Ainda não há publicações."
            }
          />
        ) : (
          <ul className="space-y-4">
            {filteredSorted.map((post) => {
              const p = normalizePost(post);
              return (
                <li
                  key={post.id}
                  className="flex flex-col sm:flex-row rounded-2xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all overflow-hidden group"
                >
                  <Link
                    to={`/Post/${post.id}`}
                    state={{ from: location.pathname + location.search }}
                    className="flex flex-col sm:flex-row sm:items-stretch flex-1 min-w-0 text-left"
                  >
                    <div className="sm:w-44 shrink-0 aspect-video sm:aspect-auto sm:min-h-[120px] border-b sm:border-b-0 sm:border-r border-border">
                      <PostPreviewThumb post={post} />
                    </div>
                    <div className="flex-1 p-4 sm:p-5 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-lg leading-snug group-hover:text-accent transition-colors">
                          {p.titulo}
                        </h3>
                        {(p.tags || []).slice(0, 2).map((t) => (
                          <Badge
                            key={normalizeTagKey(t)}
                            variant="outline"
                            className="text-xs shrink-0 gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {t}
                          </Badge>
                        ))}
                        {(p.tags || []).length > 2 ? (
                          <Badge variant="outline" className="text-xs shrink-0">
                            +{(p.tags || []).length - 2}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {p.descricao}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {p.autor ? (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {p.autor}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatPubDate(p.data_publicacao)}
                        </span>
                        {p.tipo_conteudo === "imagens" && p.imagens_urls.length > 1 ? (
                          <span className="inline-flex items-center gap-1">
                            <Images className="w-3.5 h-3.5" />
                            {p.imagens_urls.length} imagens
                          </span>
                        ) : null}
                        {p.tipo_conteudo === "video" ? (
                          <span className="inline-flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" />
                            Vídeo
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                  {(canEdit || canDelete) && (
                    <div className="flex sm:flex-col items-center justify-center gap-1 border-t sm:border-t-0 sm:border-l border-border p-2 shrink-0">
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Editar — Post"
                          onClick={() => {
                            setEditingPost(post);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          title="Eliminar"
                          onClick={() => setPendingDeleteId(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

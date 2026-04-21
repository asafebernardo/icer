import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
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
import { uploadImageFile } from "@/lib/uploadImage";

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
  const video_url = post.video_url || "";
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
    video_url,
    tipo_conteudo: tipo,
    data_publicacao: post.data_publicacao || post.created_date,
    tag: post.tag != null ? String(post.tag) : "",
    carousel_interval_sec: Math.min(
      60,
      Math.max(2, Number(post.carousel_interval_sec) || 5),
    ),
    autor: post.autor || "",
  };
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
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <BookOpen className="w-10 h-10 text-muted-foreground/55" />
    </div>
  );
}

function PostFormDialog({ open, onOpenChange, onSave, autorEmail, editingPost }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("imagens");
  const [imagens_urls, setImagensUrls] = useState([]);
  const [video_url, setVideoUrl] = useState("");
  const [dataPublicacao, setDataPublicacao] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );
  const [carousel_interval_sec, setCarouselInterval] = useState(5);
  const [tag, setTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setTitulo("");
    setDescricao("");
    setTipo("imagens");
    setImagensUrls([]);
    setVideoUrl("");
    setDataPublicacao(toDatetimeLocalValue(new Date().toISOString()));
    setCarouselInterval(5);
    setTag("");
    setError("");
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editingPost) {
      const p = normalizePost(editingPost);
      setTitulo(p.titulo);
      setDescricao(p.descricao);
      setTipo(p.tipo_conteudo);
      setImagensUrls([...p.imagens_urls]);
      setVideoUrl(p.video_url || "");
      setDataPublicacao(toDatetimeLocalValue(p.data_publicacao));
      setCarouselInterval(p.carousel_interval_sec);
      setTag(p.tag || "");
      setError("");
    } else {
      reset();
    }
  }, [open, editingPost, reset]);

  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const next = [...imagens_urls];
      for (const file of files) {
        const { file_url } = await uploadImageFile(file);
        if (file_url) next.push(file_url);
      }
      setImagensUrls(next);
    } catch {
      setError("Não foi possível enviar uma ou mais imagens. Tente novamente.");
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
    if (tipo === "imagens") {
      if (imagens_urls.length === 0) {
        setError("Adicione pelo menos uma imagem.");
        return;
      }
    } else {
      if (!video_url.trim()) {
        setError("O URL do vídeo é obrigatório.");
        return;
      }
      const trimmed = video_url.trim();
      let videoOk = false;
      try {
        const u = new URL(trimmed);
        videoOk = u.protocol === "http:" || u.protocol === "https:";
      } catch {
        videoOk = false;
      }
      if (!videoOk) {
        setError("Indique um URL de vídeo válido (ex.: link do YouTube).");
        return;
      }
    }

    onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tipo_conteudo: tipo,
      imagens_urls: tipo === "imagens" ? imagens_urls : [],
      video_url: tipo === "video" ? video_url.trim() : "",
      data_publicacao: pubIso,
      carousel_interval_sec:
        tipo === "imagens"
          ? Math.min(60, Math.max(2, Number(carousel_interval_sec) || 5))
          : null,
      tag: tag.trim() || "",
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

          <div className="space-y-2">
            <Label>Tipo de média *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imagens">Galeria de imagens</SelectItem>
                <SelectItem value="video">Vídeo (URL)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "imagens" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Imagens * (uma ou várias)</Label>
                <label
                  className={`flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-xl p-4 hover:border-accent/50 ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "A enviar…" : "Clique para escolher ficheiros"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAddImages}
                  />
                </label>
                {imagens_urls.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive -mt-1"
                    onClick={() => setImagensUrls([])}
                  >
                    Remover todas as imagens
                  </Button>
                ) : null}
              </div>
              {imagens_urls.length > 0 && (
                <>
                  {imagens_urls.length >= 16 ? (
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {imagens_urls.length}{" "}
                        {imagens_urls.length === 1
                          ? "ficheiro enviado"
                          : "ficheiros enviados"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Com 16 ou mais imagens, a pré-visualização em grelha fica
                        oculta. Pode continuar a adicionar ficheiros acima.
                      </p>
                      <details className="group text-sm">
                        <summary className="cursor-pointer text-accent hover:underline list-none [&::-webkit-details-marker]:hidden">
                          Gerir lista — remover imagens
                        </summary>
                        <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background divide-y">
                          {imagens_urls.map((url, i) => (
                            <li
                              key={`${url}-${i}`}
                              className="flex items-center justify-between gap-2 px-2 py-1.5"
                            >
                              <span className="text-muted-foreground truncate min-w-0">
                                Imagem {i + 1}
                              </span>
                              <button
                                type="button"
                                className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/15"
                                onClick={() =>
                                  setImagensUrls((arr) =>
                                    arr.filter((_, j) => j !== i),
                                  )
                                }
                                aria-label={`Remover imagem ${i + 1}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  ) : (
                    <div
                      className={
                        imagens_urls.length > 4
                          ? "grid grid-cols-4 sm:grid-cols-5 gap-1.5"
                          : "grid grid-cols-3 gap-2"
                      }
                    >
                      {imagens_urls.map((url, i) => (
                        <div
                          key={url + i}
                          className={`relative aspect-square rounded-lg overflow-hidden border ${
                            imagens_urls.length > 4 ? "rounded-md" : ""
                          }`}
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            className={`absolute rounded-full bg-background/90 flex items-center justify-center shadow ${
                              imagens_urls.length > 4
                                ? "top-0.5 right-0.5 w-6 h-6"
                                : "top-1 right-1 w-7 h-7"
                            }`}
                            onClick={() =>
                              setImagensUrls((arr) =>
                                arr.filter((_, j) => j !== i),
                              )
                            }
                            aria-label="Remover imagem"
                          >
                            <X
                              className={
                                imagens_urls.length > 4 ? "w-3 h-3" : "w-4 h-4"
                              }
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label>Intervalo do carrossel (s) *</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[carousel_interval_sec]}
                    onValueChange={(v) => setCarouselInterval(v[0])}
                    min={2}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm tabular-nums w-10">{carousel_interval_sec}s</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tempo entre transições automáticas na galeria.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="post-video">URL do vídeo *</Label>
              <Input
                id="post-video"
                value={video_url}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>
          )}

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
            <Label htmlFor="post-tag">Tag (opcional)</Label>
            <Input
              id="post-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Ex.: Jovens, Culto…"
            />
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
            {p.tag ? (
              <Badge variant="secondary" className="gap-1">
                <Tag className="w-3 h-3" />
                {p.tag}
              </Badge>
            ) : null}
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
          {p.tipo_conteudo === "video" && p.video_url ? (
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
            <ImageCarousel
              key={p.id}
              urls={p.imagens_urls}
              intervalSec={p.carousel_interval_sec}
              showControls={p.imagens_urls.length > 1}
            />
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
  const [detailPost, setDetailPost] = useState(null);
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

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      return JSON.parse(localStorage.getItem("posts") || "[]");
    },
  });

  const createPost = useMutation({
    mutationFn: async (data) => {
      const current = JSON.parse(localStorage.getItem("posts") || "[]");
      const newPost = {
        ...data,
        id: Date.now(),
        created_date: new Date().toISOString(),
      };
      localStorage.setItem("posts", JSON.stringify([newPost, ...current]));
      return newPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setShowForm(false);
      setEditingPost(null);
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const current = JSON.parse(localStorage.getItem("posts") || "[]");
      const next = current.map((p) =>
        p.id === id ? { ...p, ...data, id } : p,
      );
      localStorage.setItem("posts", JSON.stringify(next));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setShowForm(false);
      setEditingPost(null);
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id) => {
      const current = JSON.parse(localStorage.getItem("posts") || "[]");
      localStorage.setItem(
        "posts",
        JSON.stringify(current.filter((p) => p.id !== id)),
      );
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
        p.tag,
        p.autor,
        p.video_url,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    const dir = sortOrder === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const ta = new Date(normalizePost(a).data_publicacao).getTime();
      const tb = new Date(normalizePost(b).data_publicacao).getTime();
      if (ta !== tb) return ta < tb ? -dir : dir;
      return (b.id || 0) - (a.id || 0);
    });
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
                onChange={(e) => setSearch(e.target.value)}
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

        <PostDetailModal
          post={detailPost}
          open={!!detailPost}
          onOpenChange={(o) => !o && setDetailPost(null)}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(raw) => {
            setEditingPost(raw);
            setShowForm(true);
          }}
          onDelete={(id) => setPendingDeleteId(id)}
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
              if (detailPost?.id === pendingDeleteId) setDetailPost(null);
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
                  <button
                    type="button"
                    onClick={() => setDetailPost(post)}
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
                        {p.tag ? (
                          <Badge variant="outline" className="text-xs shrink-0 gap-1">
                            <Tag className="w-3 h-3" />
                            {p.tag}
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
                  </button>
                  {(canEdit || canDelete) && (
                    <div className="flex sm:flex-col items-center justify-center gap-1 border-t sm:border-t-0 sm:border-l border-border p-2 shrink-0">
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Editar"
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

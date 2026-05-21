import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  BookOpen,
  Calendar,
  Search,
  Tag,
  Images,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Video,
  FileText,
  Link2,
  Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import PageHeader from "../components/shared/PageHeader";
import EmptyState from "../components/shared/EmptyState";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import SafeImg from "../components/shared/SafeImg";
import MediaKindCornerBadge from "../components/shared/MediaKindCornerBadge";

import { getUser, canMenuAction, MENU, isAdminUser } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import {
  getPostAttachmentMime,
  getPostCardThumbnailUrl,
  getPostListThumbMediaKind,
  getYouTubeId,
  normalizePost,
  normalizeTagKey,
  normalizeVideoUrlsFromPost,
} from "@/lib/posts";

function formatPubDate(iso) {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function PostPreviewThumb({ post }) {
  const p = normalizePost(post);
  const thumb = getPostCardThumbnailUrl(post);
  const mediaKind = getPostListThumbMediaKind(post);

  if (thumb) {
    const isVideoFile =
      mediaKind === "video" &&
      !String(thumb).includes("img.youtube.com") &&
      getPostAttachmentMime(p, thumb).startsWith("video/");
    return (
      <div className="relative h-full w-full">
        {isVideoFile ? (
          <video
            src={thumb}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <SafeImg
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
        {mediaKind ? (
          <MediaKindCornerBadge kind={mediaKind} />
        ) : null}
      </div>
    );
  }
  const extVideoUrls = normalizeVideoUrlsFromPost(p);
  if (
    extVideoUrls.some((u) => String(u).trim() && !getYouTubeId(u))
  ) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-primary/10">
        <Video className="h-10 w-10 text-primary/50" />
        <MediaKindCornerBadge kind="video" />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <BookOpen className="h-10 w-10 text-muted-foreground/55" />
    </div>
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
  /** Só admins: listar rascunhos (`?drafts=1`). */
  const [showDrafts, setShowDrafts] = useState(false);
  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  const sessionUser = authUser ?? getUser();
  const { enabled: editMode } = useEditMode();
  const canCreate =
    canMenuAction(sessionUser, MENU.POSTAGENS, "create") && editMode;
  const canEdit =
    canMenuAction(sessionUser, MENU.POSTAGENS, "edit") && editMode;
  const canDelete =
    canMenuAction(sessionUser, MENU.POSTAGENS, "delete") && editMode;

  const PAGE_SIZE = 12;
  const sortParam = sortOrder === "asc" ? "data" : "-data";

  const { data, isLoading } = useQuery({
    queryKey: ["posts", page, sortOrder, showDrafts],
    queryFn: async () => {
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        skip: String(page * PAGE_SIZE),
        sort: sortParam,
      });
      if (showDrafts) qs.set("drafts", "1");
      const r = await fetch(`/api/data/posts?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
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

  useEffect(() => {
    setPage(0);
  }, [showDrafts]);

  useEffect(() => {
    if (!isAdminUser(sessionUser)) setShowDrafts(false);
  }, [sessionUser]);

  const deletePost = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/data/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ Accept: "application/json" }),
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
        normalizeVideoUrlsFromPost(p).join(" "),
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
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end mb-6">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {isAdminUser(sessionUser) ? (
              <Button
                type="button"
                variant={showDrafts ? "secondary" : "outline"}
                className="w-fit gap-2"
                aria-pressed={showDrafts}
                onClick={() => setShowDrafts((v) => !v)}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Rascunhos</span>
              </Button>
            ) : null}
            {canCreate ? (
              <Button className="w-fit gap-2" aria-label="Novo post" asChild>
                <Link to="/Postagens/nova">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo post</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Paginação */}
        {total > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3 mb-6">
            <p className="text-xs text-muted-foreground">
              {total ? `${total} publicação(ões)` : "—"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.min(page + 1, totalPages)} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : null}

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
                <SelectItem value="asc">Mais antigo</SelectItem>
                <SelectItem value="desc">Mais recente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
                : showDrafts
                  ? "Não há rascunhos guardados."
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
                  className="flex flex-col sm:flex-row rounded-2xl border border-border bg-card hover:border-accent/40 card-hover overflow-hidden group"
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
                        {(p.status === "draft" || p.is_draft) && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px] uppercase tracking-wide"
                          >
                            Rascunho
                          </Badge>
                        )}
                        {p.visibility === "unlisted" ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 gap-1 text-[10px] uppercase tracking-wide"
                            title="Não-listado — só com link direto"
                          >
                            <Link2 className="w-3 h-3" />
                            Não-listado
                          </Badge>
                        ) : null}
                        {p.visibility === "private" ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 gap-1 text-[10px] uppercase tracking-wide border-amber-500/50 text-amber-700 dark:text-amber-300"
                            title="Privada — só autor e admin"
                          >
                            <Lock className="w-3 h-3" />
                            Privada
                          </Badge>
                        ) : null}
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
                          asChild
                        >
                          <Link to={`/Postagens/editar/${post.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Link>
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

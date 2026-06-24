import { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Link2, Lock } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostMedia } from "@/components/posts/PostMedia";

import { MENU } from "@/lib/auth";
import useCanEdit from "@/lib/useCanEdit";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import {
  collectPostFeaturedEligibleUrls,
  dedupeTagsPreserveOrder,
  normalizePost,
  normalizeTagKey,
} from "@/lib/posts";
import { POST_CATEGORIA_LABELS, resolvePostCategoria } from "@/lib/postCategories";
import { sanitizeRichHtml } from "@/lib/sanitizeHtml";

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const canEditPosts = useCanEdit(MENU.POSTAGENS);

  const from = location.state?.from;

  const { data: postRaw, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const r = await fetch(`/api/data/posts/${id}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error("Não foi possível carregar o post.");
      return r.json();
    },
  });

  const post = useMemo(() => {
    return postRaw ? normalizePost(postRaw) : null;
  }, [postRaw]);

  /** Rascunho local para ordem / destaque na página (null = usar dados do servidor) */
  const [draftAnexos, setDraftAnexos] = useState(null);
  /** undefined = usar post.imagem_destaque_url */
  const [draftFeatured, setDraftFeatured] = useState(undefined);

  useEffect(() => {
    setDraftAnexos(null);
    setDraftFeatured(undefined);
  }, [postRaw?.id, postRaw?.updated_date]);

  const effectiveAnexos = draftAnexos ?? post?.anexos ?? [];
  const effectiveFeatured =
    draftFeatured !== undefined
      ? draftFeatured
      : String(post?.imagem_destaque_url ?? "").trim();

  const galleryDirty = useMemo(() => {
    if (!post) return false;
    const ax = draftAnexos ?? post.anexos ?? [];
    const ft =
      draftFeatured !== undefined
        ? draftFeatured
        : String(post.imagem_destaque_url || "").trim();
    const postFt = String(post.imagem_destaque_url || "").trim();
    return (
      JSON.stringify(ax) !== JSON.stringify(post.anexos || []) ||
      String(ft).trim() !== postFt
    );
  }, [post, draftAnexos, draftFeatured]);

  const hasGalleryImages = useMemo(() => {
    return effectiveAnexos.some(
      (a) =>
        a &&
        typeof a.mime === "string" &&
        a.mime.startsWith("image/") &&
        a.url,
    );
  }, [effectiveAnexos]);

  const inlineGalleryAdmin =
    canEditPosts &&
    hasGalleryImages &&
    !post?.usar_galeria_por_dia;

  const updateGalleryMutation = useMutation({
    mutationFn: async () => {
      if (!post?.id) throw new Error("Post inválido.");
      const eligible = collectPostFeaturedEligibleUrls({
        anexos: effectiveAnexos,
      });
      let featured = String(effectiveFeatured || "").trim();
      if (featured && !eligible.includes(featured)) featured = "";

      const r = await fetch(`/api/data/posts/${post.id}`, {
        method: "PUT",
        credentials: "include",
        headers: await withCsrfHeaderAsync({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          titulo: post.titulo.trim(),
          descricao: post.descricao.trim(),
          anexos: effectiveAnexos,
          video_urls: Array.isArray(post.video_urls) ? post.video_urls : [],
          video_url: String(post.video_url || "").trim(),
          data_publicacao: post.data_publicacao,
          carousel_interval_sec: post.carousel_interval_sec,
          tags: dedupeTagsPreserveOrder(post.tags),
          autor: post.autor || "",
          imagem_destaque_url: featured,
          usar_galeria_por_dia: Boolean(post.usar_galeria_por_dia),
          dias_galeria: Array.isArray(post.dias_galeria)
            ? post.dias_galeria
            : [],
          audio_ambiente_url: String(post.audio_ambiente_url ?? "").trim(),
          audio_ambiente_escopo:
            post.audio_ambiente_escopo === "por_secao"
              ? "por_secao"
              : "todas_secoes",
          status:
            post.status === "draft" || post.is_draft ? "draft" : "published",
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
        throw new Error(parsed?.message || "Não foi possível atualizar o post.");
      }
      return parsed;
    },
    onSuccess: () => {
      toast.success("Galeria atualizada.");
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err) => {
      toast.error(err?.message || "Não foi possível guardar.");
    },
  });

  return (
    <div>
      <PageHeader
        pageKey="postagens"
        tag="Comunidade"
        title={post?.titulo || "Post"}
        description={
          post?.descricao != null && String(post.descricao).trim()
            ? String(post.descricao)
            : undefined
        }
      />

      <section className="py-10 max-w-5xl mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (typeof from === "string" && from.startsWith("/")) {
                navigate(from);
                return;
              }
              navigate(-1);
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          {!isLoading &&
            post &&
            (post.status === "draft" || post.is_draft) && (
              <Badge
                variant="secondary"
                className="text-xs uppercase tracking-wide"
              >
                Rascunho
              </Badge>
            )}
          {!isLoading && post && post.visibility === "unlisted" ? (
            <Badge
              variant="outline"
              className="gap-1 text-xs uppercase tracking-wide"
              title="Não-listado — só com link direto"
            >
              <Link2 className="w-3 h-3" />
              Não-listado
            </Badge>
          ) : null}
          {!isLoading && post && post.visibility === "private" ? (
            <Badge
              variant="outline"
              className="gap-1 text-xs uppercase tracking-wide border-amber-500/50 text-amber-700 dark:text-amber-300"
              title="Privada — só autor e admin"
            >
              <Lock className="w-3 h-3" />
              Privada
            </Badge>
          ) : null}
          {!isLoading && post && resolvePostCategoria(post) ? (
            <Badge variant="secondary" className="text-xs">
              {POST_CATEGORIA_LABELS[resolvePostCategoria(post)]}
            </Badge>
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">A carregar…</p>
        ) : !post ? (
          <p className="text-muted-foreground">Post não encontrado.</p>
        ) : (
          <div className="space-y-4">
            {Array.isArray(post.tags) && post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <Badge
                    key={
                      typeof normalizeTagKey === "function"
                        ? normalizeTagKey(t)
                        : String(t)
                    }
                    variant="secondary"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}

            {String(post.conteudo || "").trim() ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(post.conteudo),
                }}
              />
            ) : null}

            <PostMedia
              anexos={effectiveAnexos}
              video_url={post.video_url}
              video_urls={post.video_urls}
              intervalSec={post.carousel_interval_sec}
              showPresentationButton
              usarGaleriaPorDia={Boolean(post.usar_galeria_por_dia)}
              diasGaleria={post.dias_galeria}
              audioAmbienteUrl={post.audio_ambiente_url}
              audioAmbienteEscopo={post.audio_ambiente_escopo}
              galleryAdmin={
                inlineGalleryAdmin
                  ? {
                      anexos: effectiveAnexos,
                      onReorderAnexos: setDraftAnexos,
                      imagemDestaqueUrl: effectiveFeatured,
                      onImagemDestaqueChange: setDraftFeatured,
                      onSave: () => updateGalleryMutation.mutate(),
                      saving: updateGalleryMutation.isPending,
                      saveError:
                        updateGalleryMutation.error?.message ?? "",
                      saveDisabled: !galleryDirty,
                    }
                  : null
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}


import { useMemo, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link2, Lock, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PostMedia } from "@/components/posts/PostMedia";
import PostInlineEditor from "@/components/posts/PostInlineEditor";
import PostsHubHeader from "@/components/posts/PostsHubHeader";
import PostsNavBreadcrumb from "@/components/posts/PostsNavBreadcrumb";

import { MENU } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import useCanEdit from "@/lib/useCanEdit";
import {
  getPostCategoryGroupId,
  resolvePostCategoria,
} from "@/lib/postCategories";
import {
  getPostPublicationYear,
  normalizePost,
  normalizeTagKey,
  postYearToQueryValue,
  categoryUsesYearMosaic,
} from "@/lib/posts";
import { sanitizeRichHtml } from "@/lib/sanitizeHtml";
import { getPostCategoryPath, POSTS_HUB_PATH } from "@/lib/postsNavPath";
import { cn } from "@/lib/utils";

function resolvePostBackTo(post, from) {
  if (typeof from === "string" && from.startsWith("/")) {
    return from;
  }

  const catKey = resolvePostCategoria(post) || "noticias";
  const year = getPostPublicationYear(post);

  if (categoryUsesYearMosaic(catKey) && year != null) {
    return getPostCategoryPath(catKey, {
      search: `ano=${encodeURIComponent(postYearToQueryValue(year))}`,
    });
  }

  return getPostCategoryPath(catKey);
}

export default function PostPage() {
  const { id } = useParams();
  const location = useLocation();
  const canEditPosts = useCanEdit(MENU.POSTAGENS);
  const { checkUserAuth } = useAuth();

  const from = location.state?.from;
  const returnPath = `${location.pathname}${location.search}`;
  const [inlineEditOpen, setInlineEditOpen] = useState(false);

  useEffect(() => {
    checkUserAuth?.();
  }, [checkUserAuth]);

  useEffect(() => {
    setInlineEditOpen(false);
  }, [id]);

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

  const catKey = post ? resolvePostCategoria(post) || "noticias" : null;
  const groupId = catKey ? getPostCategoryGroupId(catKey) : null;
  const publicationYear = post ? getPostPublicationYear(post) : undefined;
  const usesYearMosaic = catKey ? categoryUsesYearMosaic(catKey) : false;
  const backTo = post ? resolvePostBackTo(post, from) : POSTS_HUB_PATH;

  const headerActions =
    post && canEditPosts ? (
      <Button
        type="button"
        variant={inlineEditOpen ? "secondary" : "outline"}
        size="sm"
        className={cn(
          "h-8 gap-1.5 px-3 text-xs",
          !inlineEditOpen &&
            "border-white/[0.08] bg-[#08111F]/50 text-[#94A3B8] hover:text-[#F8FAFC]",
        )}
        onClick={() => setInlineEditOpen((open) => !open)}
      >
        <Pencil className="h-3.5 w-3.5" />
        {inlineEditOpen ? "Ver publicação" : "Editar aqui"}
      </Button>
    ) : null;

  const description = String(post?.descricao || "").trim();
  const showYearInBreadcrumb =
    usesYearMosaic &&
    publicationYear !== undefined &&
    publicationYear !== null;

  return (
    <div className="posts-hub min-h-screen">
      <div className="posts-hub__atmosphere" aria-hidden />

      <section
        className={cn(
          "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          "max-w-[1280px]",
        )}
      >
        <PostsHubHeader
          actions={headerActions}
          backTo={backTo}
          breadcrumb={
            !isLoading && post ? (
              <PostsNavBreadcrumb
                centered
                groupId={groupId}
                categoryKey={catKey}
                year={showYearInBreadcrumb ? publicationYear : undefined}
                includeYear={showYearInBreadcrumb}
              />
            ) : null
          }
        />

        {!isLoading && post ? (
          <>
            {post.status === "draft" ||
            post.is_draft ||
            post.visibility === "unlisted" ||
            post.visibility === "private" ? (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {post.status === "draft" || post.is_draft ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase tracking-wide"
                  >
                    Rascunho
                  </Badge>
                ) : null}
                {post.visibility === "unlisted" ? (
                  <Badge
                    variant="outline"
                    className="gap-1 text-[10px] uppercase tracking-wide"
                    title="Não-listado — só com link direto"
                  >
                    <Link2 className="h-3 w-3" />
                    Não-listado
                  </Badge>
                ) : null}
                {post.visibility === "private" ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-500/50 text-[10px] uppercase tracking-wide text-amber-300"
                    title="Privada — só autor e admin"
                  >
                    <Lock className="h-3 w-3" />
                    Privada
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="mt-6 sm:mt-8">
          {isLoading ? (
            <p className="text-sm text-[#64748B]">A carregar…</p>
          ) : !post ? (
            <p className="text-sm text-[#64748B]">Post não encontrado.</p>
          ) : inlineEditOpen && canEditPosts ? (
            <PostInlineEditor
              post={post}
              postId={post.id}
              returnPath={returnPath}
              onCancel={() => setInlineEditOpen(false)}
              onSaved={() => setInlineEditOpen(false)}
            />
          ) : (
            <div className="space-y-6">
              <header className="space-y-2">
                <h1 className="sr-only">{post.titulo}</h1>
                {description ? (
                  <p className="text-base leading-relaxed text-[#94A3B8] sm:text-lg">
                    {description}
                  </p>
                ) : (
                  <p className="font-display text-xl font-semibold tracking-tight text-[#F8FAFC] sm:text-2xl">
                    {post.titulo}
                  </p>
                )}
              </header>

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
                  className="prose prose-sm dark:prose-invert max-w-none text-[#E2E8F0]"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichHtml(post.conteudo),
                  }}
                />
              ) : null}

              <PostMedia
                anexos={post.anexos}
                video_url={post.video_url}
                video_urls={post.video_urls}
                intervalSec={post.carousel_interval_sec}
                showPresentationButton
                usarGaleriaPorDia={Boolean(post.usar_galeria_por_dia)}
                diasGaleria={post.dias_galeria}
                audioAmbienteUrl={post.audio_ambiente_url}
                audioAmbienteEscopo={post.audio_ambiente_escopo}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

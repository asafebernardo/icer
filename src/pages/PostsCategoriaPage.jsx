import { useState, useEffect } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen } from "lucide-react";

import PostsAgendaHubPage from "./PostsAgendaHubPage";
import PostsEventosHubPage from "./PostsEventosHubPage";
import { Button } from "@/components/ui/button";
import EmptyState from "../components/shared/EmptyState";
import { SOFT_DELETE_CONFIRM_DESCRIPTION } from "@/lib/softDeleteUi";
import PostsCategoryFeed, {
  PostsCategoryFeedSkeleton,
} from "../components/posts/PostsCategoryFeed";
import PostsAdminToolbar from "../components/posts/PostsAdminToolbar";
import { FEED_MAX_W } from "../components/posts/PostsPageHero";

import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import {
  POST_CATEGORIA_LABELS,
  POST_FEED_SECTION_LABELS,
  POST_FEED_SECTION_ORDER,
} from "@/lib/postCategories";
import { usePostsList } from "@/hooks/usePostsList";
import { formatPostCount } from "@/hooks/usePostCategoryCounts";
import { cn } from "@/lib/utils";

const VALID_CATEGORIES = new Set([...POST_FEED_SECTION_ORDER]);

export default function PostsCategoriaPage() {
  const { categoria } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user: authUser, checkUserAuth } = useAuth();

  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const catKey = String(categoria || "").trim().toLowerCase();

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  const sessionUser = authUser ?? getUser();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();
  const canCreate =
    canMenuAction(sessionUser, MENU.POSTAGENS, "create") && editMode;
  const canEdit =
    canMenuAction(sessionUser, MENU.POSTAGENS, "edit") && editMode;
  const canDelete =
    canMenuAction(sessionUser, MENU.POSTAGENS, "delete") && editMode;

  const { posts, isLoading } = usePostsList({
    categoriaKey: catKey,
  });

  const deletePost = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/data/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ Accept: "application/json" }),
      });
      if (!r.ok && r.status !== 204) {
        throw new Error("Não foi possível eliminar o post.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  if (catKey === "agenda") {
    return <PostsAgendaHubPage />;
  }

  if (catKey === "eventos") {
    return <PostsEventosHubPage />;
  }

  if (!VALID_CATEGORIES.has(catKey)) {
    return <Navigate to="/Posts" replace />;
  }

  const categoryLabel =
    POST_FEED_SECTION_LABELS[catKey] ||
    POST_CATEGORIA_LABELS[catKey] ||
    catKey;

  return (
    <div className="posts-hub min-h-screen">
      <div className="posts-hub__atmosphere" aria-hidden />

      <section
        className={cn(
          "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          FEED_MAX_W,
        )}
      >
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-2 text-[#94A3B8] hover:text-[#F8FAFC]"
              asChild
            >
              <Link to="/Posts">
                <ArrowLeft className="h-4 w-4" />
                Categorias
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
                {categoryLabel}
              </h1>
              {!isLoading && (
                <p className="mt-0.5 text-xs font-medium tracking-wide text-[#64748B]">
                  {formatPostCount(posts.length)}
                </p>
              )}
            </div>
          </div>
          <PostsAdminToolbar
            canCreate={canCreate}
            createHref={`/Posts/nova?categoria=${encodeURIComponent(catKey)}`}
            needsEditMode={
              canMenuAction(sessionUser, MENU.POSTAGENS, "create") &&
              !editMode &&
              !isHomolog
            }
          />
        </div>

        <ConfirmDialog
          open={pendingDeleteId != null}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteId(null);
          }}
          title="Eliminar esta publicação?"
          description={SOFT_DELETE_CONFIRM_DESCRIPTION}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={() => {
            if (pendingDeleteId != null) {
              deletePost.mutate(pendingDeleteId);
            }
          }}
        />

        {isLoading ? (
          <PostsCategoryFeedSkeleton />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum post"
            description={
              catKey === "noticias"
                ? "Publicações gerais e avisos aparecem aqui."
                : `Ainda não há publicações em ${categoryLabel}.`
            }
          />
        ) : (
          <PostsCategoryFeed
            posts={posts}
            location={location}
            canEdit={canEdit}
            canDelete={canDelete}
            onDelete={setPendingDeleteId}
          />
        )}
      </section>
    </div>
  );
}

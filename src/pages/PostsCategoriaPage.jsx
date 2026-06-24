import { useState, useEffect, useMemo } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

import PostsAgendaHubPage from "./PostsAgendaHubPage";
import PostsEventosHubPage from "./PostsEventosHubPage";
import EmptyState from "../components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { SOFT_DELETE_CONFIRM_DESCRIPTION } from "@/lib/softDeleteUi";
import {
  PostsCategoryDateMosaicList,
  PostsCategoryFeedSkeleton,
  PostsCategoryPostList,
  PostsCategoryYearMosaic,
} from "../components/posts/PostsCategoryFeed";
import PostsAdminToolbar from "../components/posts/PostsAdminToolbar";
import PostsHubHeader from "../components/posts/PostsHubHeader";
import PostsNavBreadcrumb from "../components/posts/PostsNavBreadcrumb";

import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import {
  POST_FEED_SECTION_ORDER,
  categoryOpensPostDirectlyOnYearClick,
  categoryUsesBlurredDatePostCards,
  getPostCategoryGroupId,
} from "@/lib/postCategories";
import { usePostsList } from "@/hooks/usePostsList";
import { formatPostCount } from "@/hooks/usePostCategoryCounts";
import {
  categoryUsesYearMosaic,
  getPostPublicationYear,
  getPrimaryPostForYear,
  normalizePost,
  parsePostYearQueryValue,
} from "@/lib/posts";
import { cn } from "@/lib/utils";

const VALID_CATEGORIES = new Set([...POST_FEED_SECTION_ORDER]);

export default function PostsCategoriaPage() {
  const { categoria } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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

  const usesYearMosaic = categoryUsesYearMosaic(catKey);
  const yearQuery = searchParams.get("ano");
  const parsedYear =
    yearQuery != null ? parsePostYearQueryValue(yearQuery) : undefined;
  const yearViewActive =
    usesYearMosaic && yearQuery != null && parsedYear !== undefined;
  const selectedYear = yearViewActive ? parsedYear : undefined;

  const postsForYear = useMemo(() => {
    if (!yearViewActive || selectedYear === undefined) return null;
    return posts.filter(
      (post) => getPostPublicationYear(normalizePost(post)) === selectedYear,
    );
  }, [posts, yearViewActive, selectedYear]);

  const categoryPath = `/Posts/categoria/${catKey}`;
  const usesDateMosaic = categoryUsesBlurredDatePostCards(catKey);
  const opensPostDirectlyOnYear = categoryOpensPostDirectlyOnYearClick(catKey);

  if (yearViewActive && !isLoading && opensPostDirectlyOnYear) {
    const primaryPost = getPrimaryPostForYear(postsForYear || []);
    if (primaryPost?.id != null) {
      return (
        <Navigate
          to={`/Post/${primaryPost.id}`}
          replace
          state={{ from: categoryPath }}
        />
      );
    }
  }

  const groupId = getPostCategoryGroupId(catKey);
  const yearLabel =
    selectedYear == null ? "Sem data" : String(selectedYear);

  const displayCount = yearViewActive
    ? (postsForYear?.length ?? 0)
    : posts.length;

  const backTo = yearViewActive
    ? categoryPath
    : groupId
      ? `/Posts/grupo/${encodeURIComponent(groupId)}`
      : "/Posts";

  const headerActions = yearViewActive ? (
    <PostsAdminToolbar
      compact
      canCreate={canCreate}
      createHref={`/Posts/nova?categoria=${encodeURIComponent(catKey)}`}
      needsEditMode={
        canMenuAction(sessionUser, MENU.POSTAGENS, "create") &&
        !editMode &&
        !isHomolog
      }
    />
  ) : null;

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
            <PostsNavBreadcrumb
              centered
              groupId={groupId}
              categoryKey={catKey}
              year={yearViewActive ? selectedYear : undefined}
              includeYear={yearViewActive}
            />
          }
        />

        {!isLoading ? (
          <p className="mt-2 text-center text-xs font-medium tracking-wide text-[#64748B]">
            {formatPostCount(displayCount)}
          </p>
        ) : null}

        <div className="mt-6 sm:mt-8">
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
          <PostsCategoryFeedSkeleton
            count={5}
            variant={
              yearViewActive && usesDateMosaic
                ? "dateMosaic"
                : usesYearMosaic && !yearViewActive
                  ? "mosaic"
                  : "list"
            }
          />
        ) : yearViewActive ? (
          postsForYear?.length ? (
            usesDateMosaic ? (
              <PostsCategoryDateMosaicList
                posts={postsForYear}
                location={location}
                categoryKey={catKey}
                canEdit={canEdit}
                canDelete={canDelete}
                onDelete={setPendingDeleteId}
              />
            ) : (
              <PostsCategoryPostList
                posts={postsForYear}
                location={location}
                categoryKey={catKey}
                year={selectedYear}
                canEdit={canEdit}
                canDelete={canDelete}
                onDelete={setPendingDeleteId}
              />
            )
          ) : (
            <EmptyState
              icon={BookOpen}
              title={`Nenhuma publicação em ${yearLabel}`}
              description="Crie a primeira publicação deste ano."
              action={
                canCreate ? (
                  <Button size="sm" asChild>
                    <Link
                      to={`/Posts/nova?categoria=${encodeURIComponent(catKey)}`}
                      state={{ from: `${location.pathname}${location.search}` }}
                    >
                      Novo post
                    </Link>
                  </Button>
                ) : canMenuAction(sessionUser, MENU.POSTAGENS, "create") &&
                  !editMode &&
                  !isHomolog ? (
                  <p className="text-xs text-[#64748B]">
                    Ative o modo edição para criar publicações.
                  </p>
                ) : null
              }
            />
          )
        ) : usesYearMosaic ? (
          <PostsCategoryYearMosaic
            posts={posts}
            categoryPath={categoryPath}
            categoryKey={catKey}
            location={location}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum post"
            description="Publicações gerais e avisos aparecem aqui."
          />
        ) : (
          <PostsCategoryPostList
            posts={posts}
            location={location}
            categoryKey={catKey}
            canEdit={canEdit}
            canDelete={canDelete}
            onDelete={setPendingDeleteId}
          />
        )}
        </div>
      </section>
    </div>
  );
}

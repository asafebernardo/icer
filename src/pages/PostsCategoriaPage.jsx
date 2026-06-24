import { useState, useEffect, useMemo } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

import PostsAgendaHubPage from "./PostsAgendaHubPage";
import PostsAplicativosHubPage from "./PostsAplicativosHubPage";
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
import PostsYearFilterBar from "../components/posts/PostsYearFilterBar";
import EmptyState from "../components/shared/EmptyState";

import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import {
  POST_FEED_SECTION_ORDER,
  POST_MOSAIC_EVENTOS_CATEGORY_KEYS,
  POST_FEED_SECTION_LABELS,
  categoryOpensPostDirectlyOnYearClick,
  categoryUsesBlurredDatePostCards,
  categoryUsesYearPostList,
  getPostCategoryGroupId,
} from "@/lib/postCategories";
import { usePostsList } from "@/hooks/usePostsList";
import {
  categoryUsesYearMosaic,
  getPostPublicationYear,
  getPrimaryPostForYear,
  normalizePost,
  parsePostYearQueryValue,
  postYearToQueryValue,
} from "@/lib/posts";
import {
  getPostCategoryPath,
  getPostCreateButtonLabel,
  getInformacoesAgendaPath,
  INFORMACOES_HUB_PATH,
  POSTS_HUB_PATH,
} from "@/lib/postsNavPath";
import {
  filterPostsBySelectedYears,
  getPostsFilterYears,
  togglePostsFilterYear,
} from "@/lib/postsYearFilter";
import { cn } from "@/lib/utils";

const VALID_CATEGORIES = new Set([...POST_FEED_SECTION_ORDER]);
const EVENTOS_POST_CATEGORIES = new Set(POST_MOSAIC_EVENTOS_CATEGORY_KEYS);

export default function PostsCategoriaPage() {
  const { categoria } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user: authUser, checkUserAuth } = useAuth();

  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const catKey = String(categoria || "").trim().toLowerCase();
  const onInformacoesHub = location.pathname.startsWith("/Informacoes");
  const groupId = getPostCategoryGroupId(catKey);
  const isEventosPostCategory = EVENTOS_POST_CATEGORIES.has(catKey);

  const yearQuery = searchParams.get("ano");
  const parsedYear =
    yearQuery != null ? parsePostYearQueryValue(yearQuery) : undefined;

  const [selectedYears, setSelectedYears] = useState(() => new Set());
  const [yearsInitialized, setYearsInitialized] = useState(false);

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

  const eventosPosts = useMemo(() => {
    if (!isEventosPostCategory) return [];
    return posts;
  }, [posts, isEventosPostCategory]);

  const availableYears = useMemo(() => {
    if (!isEventosPostCategory) return [];
    return getPostsFilterYears(eventosPosts);
  }, [eventosPosts, isEventosPostCategory]);

  const activeYears = useMemo(() => {
    if (!isEventosPostCategory) return new Set();
    return selectedYears.size > 0 ? selectedYears : new Set(availableYears);
  }, [isEventosPostCategory, selectedYears, availableYears]);

  const filteredEventosPosts = useMemo(() => {
    if (!isEventosPostCategory) return [];
    return filterPostsBySelectedYears(
      eventosPosts,
      activeYears,
      availableYears,
    );
  }, [eventosPosts, isEventosPostCategory, activeYears, availableYears]);

  const usesYearMosaic = categoryUsesYearMosaic(catKey);
  const yearViewActive =
    !isEventosPostCategory &&
    usesYearMosaic &&
    yearQuery != null &&
    parsedYear !== undefined;
  const selectedYear = yearViewActive ? parsedYear : undefined;

  const postsForYear = useMemo(() => {
    if (!yearViewActive || selectedYear === undefined) return null;
    return posts.filter(
      (post) => getPostPublicationYear(normalizePost(post)) === selectedYear,
    );
  }, [posts, yearViewActive, selectedYear]);

  useEffect(() => {
    setYearsInitialized(false);
    setSelectedYears(new Set());
  }, [catKey]);

  useEffect(() => {
    if (!isEventosPostCategory || yearsInitialized || isLoading) return;
    if (parsedYear !== undefined) {
      if (parsedYear === null) {
        setSelectedYears(new Set([null]));
      } else if (availableYears.includes(parsedYear)) {
        setSelectedYears(new Set([parsedYear]));
      } else if (availableYears.length > 0) {
        setSelectedYears(new Set(availableYears));
      }
    } else if (availableYears.length > 0) {
      setSelectedYears(new Set(availableYears));
    }
    setYearsInitialized(true);
  }, [
    isEventosPostCategory,
    yearsInitialized,
    isLoading,
    parsedYear,
    availableYears,
  ]);

  const syncYearSearchParams = (nextYears) => {
    if (nextYears.size === 1) {
      const year = [...nextYears][0];
      setSearchParams(
        { ano: postYearToQueryValue(year) },
        { replace: true },
      );
      return;
    }
    if (searchParams.has("ano")) {
      setSearchParams({}, { replace: true });
    }
  };

  const toggleEventosYear = (year) => {
    setSelectedYears((prev) => {
      const next = togglePostsFilterYear(prev, availableYears, year);
      syncYearSearchParams(next);
      return next;
    });
  };

  const selectAllEventosYears = () => {
    const next = new Set(availableYears);
    setSelectedYears(next);
    syncYearSearchParams(next);
  };

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

  if (
    groupId === "informacoes" &&
    !onInformacoesHub &&
    (VALID_CATEGORIES.has(catKey) ||
      catKey === "agenda" ||
      catKey === "aplicativos" ||
      catKey === "eventos")
  ) {
    return (
      <Navigate
        to={`/Informacoes/categoria/${encodeURIComponent(catKey)}${location.search}`}
        replace
      />
    );
  }

  if (groupId === "eventos" && onInformacoesHub) {
    return (
      <Navigate
        to={`/Eventos/categoria/${encodeURIComponent(catKey)}${location.search}`}
        replace
      />
    );
  }

  if (catKey === "eventos") {
    const tabParam = String(searchParams.get("tab") || "").trim().toLowerCase();
    return (
      <Navigate
        to={getInformacoesAgendaPath({
          tab: tabParam === "configuracoes" ? "configuracoes" : "eventos",
          novo: searchParams.get("novo") === "1",
        })}
        replace
      />
    );
  }

  if (catKey === "agenda") {
    return <PostsAgendaHubPage />;
  }

  if (catKey === "aplicativos") {
    return <PostsAplicativosHubPage />;
  }

  if (!VALID_CATEGORIES.has(catKey)) {
    return <Navigate to={INFORMACOES_HUB_PATH} replace />;
  }

  const categoryPath = getPostCategoryPath(catKey);
  const hubPath =
    groupId === "informacoes" ? INFORMACOES_HUB_PATH : POSTS_HUB_PATH;
  const usesDateMosaic = categoryUsesBlurredDatePostCards(catKey);
  const opensPostDirectlyOnYear = categoryOpensPostDirectlyOnYearClick(catKey);
  const singleEventosYear =
    isEventosPostCategory && activeYears.size === 1
      ? [...activeYears][0]
      : undefined;

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

  const yearLabel =
    (isEventosPostCategory ? singleEventosYear : selectedYear) == null
      ? "Sem data"
      : String(isEventosPostCategory ? singleEventosYear : selectedYear);

  const backTo = isEventosPostCategory
    ? hubPath
    : yearViewActive
      ? categoryPath
      : hubPath;

  const createPostHref = `/Eventos/nova?categoria=${encodeURIComponent(catKey)}`;
  const createPostLabel = getPostCreateButtonLabel(catKey);

  const showPostCreateToolbar =
    groupId !== "informacoes" &&
    (isEventosPostCategory || yearViewActive || usesYearMosaic);

  const headerActions = showPostCreateToolbar ? (
      <PostsAdminToolbar
        compact
        canCreate={canCreate}
        createHref={createPostHref}
        createLabel={createPostLabel}
        needsEditMode={
          canMenuAction(sessionUser, MENU.POSTAGENS, "create") &&
          !editMode &&
          !isHomolog
        }
      />
    ) : null;

  const renderEventosCategoryContent = () => {
    if (filteredEventosPosts.length === 0) {
      return (
        <EmptyState
          icon={BookOpen}
          title={
            activeYears.size < availableYears.length
              ? "Nenhuma publicação nos anos seleccionados"
              : `Nenhuma publicação em ${POST_FEED_SECTION_LABELS[catKey] || catKey}`
          }
          description={
            activeYears.size < availableYears.length
              ? "Seleccione outros anos ou toque em «Todos»."
              : "Crie a primeira publicação desta categoria."
          }
          action={
            canCreate ? (
              <Button size="sm" asChild>
                <Link
                  to={createPostHref}
                  state={{ from: `${location.pathname}${location.search}` }}
                >
                  {createPostLabel}
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
      );
    }

    if (usesDateMosaic) {
      return (
        <PostsCategoryDateMosaicList
          posts={filteredEventosPosts}
          location={location}
          categoryKey={catKey}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={setPendingDeleteId}
        />
      );
    }

    if (categoryUsesYearPostList(catKey)) {
      return (
        <PostsCategoryPostList
          posts={filteredEventosPosts}
          location={location}
          categoryKey={catKey}
          year={singleEventosYear}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={setPendingDeleteId}
        />
      );
    }

    return (
      <PostsCategoryYearMosaic
        posts={filteredEventosPosts}
        categoryPath={categoryPath}
        categoryKey={catKey}
        location={location}
      />
    );
  };

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
              year={
                isEventosPostCategory
                  ? singleEventosYear
                  : yearViewActive
                    ? selectedYear
                    : undefined
              }
              includeYear={
                isEventosPostCategory
                  ? singleEventosYear !== undefined
                  : yearViewActive
              }
            />
          }
        />

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
              isEventosPostCategory
                ? usesDateMosaic
                  ? "dateMosaic"
                  : categoryUsesYearPostList(catKey)
                    ? "list"
                    : "mosaic"
                : yearViewActive && usesDateMosaic
                  ? "dateMosaic"
                  : usesYearMosaic && !yearViewActive
                    ? "mosaic"
                    : "list"
            }
          />
        ) : isEventosPostCategory ? (
          <>
            <PostsYearFilterBar
              years={availableYears}
              selectedYears={activeYears}
              onToggleYear={toggleEventosYear}
              onSelectAll={selectAllEventosYears}
            />
            {renderEventosCategoryContent()}
          </>
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
                      to={createPostHref}
                      state={{ from: `${location.pathname}${location.search}` }}
                    >
                      {createPostLabel}
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

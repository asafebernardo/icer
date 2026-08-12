import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

import {
  PostsCategoryFeedSkeleton,
  PostsCategoryPostList,
} from "../components/posts/PostsCategoryFeed";
import PostsAdminToolbar from "../components/posts/PostsAdminToolbar";
import {
  POSTS_EVENTOS_ALL_CARDS,
  POSTS_EVENTOS_ALL_YEARS,
  PostsEventosHubActiveFilters,
  PostsEventosHubFilterTrigger,
  PostsEventosHubSearch,
} from "../components/posts/PostsEventosHubFilters";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { SOFT_DELETE_CONFIRM_DESCRIPTION } from "@/lib/softDeleteUi";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { usePostsList } from "@/hooks/usePostsList";
import {
  POST_FEED_SECTION_LABELS,
  POST_MOSAIC_EVENTOS_CATEGORY_KEYS,
  POST_MOSAIC_EVENTOS_SUBGROUPS,
  resolvePostCategoria,
} from "@/lib/postCategories";
import {
  getPostPublicationYear,
  isPostDemoExample,
  normalizePost,
  sortPostsByPublicationDate,
} from "@/lib/posts";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import { cn } from "@/lib/utils";

const EVENTOS_CATEGORY_SET = new Set(POST_MOSAIC_EVENTOS_CATEGORY_KEYS);
const PAGE_SIZE = 10;

function normalizeSearch(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export default function Postagens() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user: authUser, checkUserAuth } = useAuth();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();
  const { posts, isLoading: postsLoading } = usePostsList();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);
  const [selectedYear, setSelectedYear] = useState(POSTS_EVENTOS_ALL_YEARS);
  const [selectedCard, setSelectedCard] = useState(POSTS_EVENTOS_ALL_CARDS);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [page, setPage] = useState(0);

  const sessionUser = authUser ?? getUser();
  const canCreate =
    canMenuAction(sessionUser, MENU.POSTAGENS, "create") && editMode;
  const canEdit =
    canMenuAction(sessionUser, MENU.POSTAGENS, "edit") && editMode;
  const canDelete =
    canMenuAction(sessionUser, MENU.POSTAGENS, "delete") && editMode;
  const needsEditMode =
    canMenuAction(sessionUser, MENU.POSTAGENS, "create") &&
    !editMode &&
    !isHomolog;

  useEffect(() => {
    checkUserAuth?.();
  }, [checkUserAuth]);

  const eventosPosts = useMemo(() => {
    return posts.filter((post) => {
      if (isPostDemoExample(post)) return false;
      const cat = resolvePostCategoria(post);
      return cat && EVENTOS_CATEGORY_SET.has(cat);
    });
  }, [posts]);

  const listedPosts = useMemo(() => {
    let list = sortPostsByPublicationDate(eventosPosts);

    if (selectedCard !== POSTS_EVENTOS_ALL_CARDS) {
      list = list.filter(
        (post) => resolvePostCategoria(post) === selectedCard,
      );
    } else if (selectedSubgroup) {
      const subgroup = POST_MOSAIC_EVENTOS_SUBGROUPS.find(
        (item) => item.id === selectedSubgroup,
      );
      if (subgroup) {
        const categorySet = new Set(subgroup.categories);
        list = list.filter((post) => {
          const cat = resolvePostCategoria(post);
          return cat && categorySet.has(cat);
        });
      }
    }

    if (selectedYear !== POSTS_EVENTOS_ALL_YEARS) {
      const y = Number.parseInt(selectedYear, 10);
      if (Number.isFinite(y)) {
        list = list.filter(
          (post) => getPostPublicationYear(normalizePost(post)) === y,
        );
      }
    }

    const q = normalizeSearch(searchQuery);
    if (q) {
      list = list.filter((post) => {
        const p = normalizePost(post);
        const cat = resolvePostCategoria(p);
        const catLabel = cat ? POST_FEED_SECTION_LABELS[cat] || cat : "";
        const haystack = normalizeSearch(
          `${p.titulo || ""} ${p.descricao || ""} ${catLabel}`,
        );
        return haystack.includes(q);
      });
    }

    return list;
  }, [eventosPosts, searchQuery, selectedYear, selectedCard, selectedSubgroup]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedYear, selectedCard, selectedSubgroup]);

  const totalPages = Math.max(1, Math.ceil(listedPosts.length / PAGE_SIZE));
  const pagePosts = listedPosts.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const headers = await withCsrfHeaderAsync({
        Accept: "application/json",
      });
      const r = await fetch(`/api/data/posts/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Não foi possível eliminar.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      setPendingDeleteId(null);
    },
  });

  const filtersActive =
    Boolean(searchQuery.trim()) ||
    selectedYear !== POSTS_EVENTOS_ALL_YEARS ||
    selectedCard !== POSTS_EVENTOS_ALL_CARDS ||
    Boolean(selectedSubgroup);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSubgroup(null);
    setSelectedYear(POSTS_EVENTOS_ALL_YEARS);
    setSelectedCard(POSTS_EVENTOS_ALL_CARDS);
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
        <PostsAdminToolbar
          className="mb-3"
          canCreate={canCreate}
          createHref={
            selectedCard !== POSTS_EVENTOS_ALL_CARDS
              ? `/Eventos/nova?categoria=${encodeURIComponent(selectedCard)}`
              : "/Eventos/nova"
          }
          needsEditMode={needsEditMode}
          start={
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <PostsEventosHubSearch
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
              <PostsEventosHubFilterTrigger
                posts={eventosPosts}
                selectedSubgroup={selectedSubgroup}
                onSubgroupChange={setSelectedSubgroup}
                selectedCard={selectedCard}
                onCardChange={setSelectedCard}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                onClearFilters={clearFilters}
                filtersActive={
                  selectedYear !== POSTS_EVENTOS_ALL_YEARS ||
                  selectedCard !== POSTS_EVENTOS_ALL_CARDS ||
                  Boolean(selectedSubgroup)
                }
              />
            </div>
          }
        />

        <PostsEventosHubActiveFilters
          selectedSubgroup={selectedSubgroup}
          onSubgroupChange={setSelectedSubgroup}
          selectedCard={selectedCard}
          onCardChange={setSelectedCard}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          onClearFilters={clearFilters}
        />

        <div>
          {postsLoading ? (
            <PostsCategoryFeedSkeleton count={10} variant="list" />
          ) : listedPosts.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={
                filtersActive
                  ? "Nenhuma publicação encontrada"
                  : "Nenhuma publicação"
              }
              description={
                filtersActive
                  ? "Ajuste a pesquisa ou os filtros de ano e evento."
                  : "Ainda não há publicações de eventos."
              }
            />
          ) : (
            <>
              <PostsCategoryPostList
                posts={pagePosts}
                location={location}
                canEdit={canEdit}
                canDelete={canDelete}
                onDelete={setPendingDeleteId}
              />
              {totalPages > 1 ? (
                <div className="flex justify-center border-t border-border/60 pt-8 mt-6">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
                      {Math.min(page + 1, totalPages)} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={page + 1 >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Eliminar publicação?"
        description={SOFT_DELETE_CONFIRM_DESCRIPTION}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (pendingDeleteId != null) {
            deleteMutation.mutate(pendingDeleteId);
          }
        }}
      />
    </div>
  );
}

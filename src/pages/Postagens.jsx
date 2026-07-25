import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

import {
  PostsCategoryFeedSkeleton,
  PostsCategoryPostList,
} from "../components/posts/PostsCategoryFeed";
import PostsAdminToolbar from "../components/posts/PostsAdminToolbar";
import {
  POSTS_EVENTOS_ALL_CARDS,
  POSTS_EVENTOS_ALL_YEARS,
  PostsEventosHubSearch,
  PostsEventosHubSelectFilters,
} from "../components/posts/PostsEventosHubFilters";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { SOFT_DELETE_CONFIRM_DESCRIPTION } from "@/lib/softDeleteUi";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { usePostsList } from "@/hooks/usePostsList";
import {
  POST_FEED_SECTION_LABELS,
  POST_MOSAIC_EVENTOS_CATEGORY_KEYS,
  resolvePostCategoria,
} from "@/lib/postCategories";
import {
  getPostPublicationYear,
  normalizePost,
  sortPostsByPublicationDate,
} from "@/lib/posts";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import { cn } from "@/lib/utils";

const EVENTOS_CATEGORY_SET = new Set(POST_MOSAIC_EVENTOS_CATEGORY_KEYS);

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
  const [selectedYear, setSelectedYear] = useState(POSTS_EVENTOS_ALL_YEARS);
  const [selectedCard, setSelectedCard] = useState(POSTS_EVENTOS_ALL_CARDS);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

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
  }, [eventosPosts, searchQuery, selectedYear, selectedCard]);

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
    selectedCard !== POSTS_EVENTOS_ALL_CARDS;

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
          className="mb-6"
          canCreate={canCreate}
          createHref="/Eventos/nova"
          needsEditMode={needsEditMode}
          start={
            <PostsEventosHubSearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          }
          end={
            <PostsEventosHubSelectFilters
              posts={eventosPosts}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              selectedCard={selectedCard}
              onCardChange={setSelectedCard}
            />
          }
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
            <PostsCategoryPostList
              posts={listedPosts}
              location={location}
              canEdit={canEdit}
              canDelete={canDelete}
              onDelete={setPendingDeleteId}
            />
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

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

import SafeImg from "@/components/shared/SafeImg";
import EmptyState from "@/components/shared/EmptyState";
import PostsEventosSubgroupFilterBar from "@/components/posts/PostsEventosSubgroupFilterBar";
import {
  POST_CATEGORIA_MOSAIC_TAG,
  POST_CATEGORIA_MOSAIC_THUMBS,
  POST_FEED_SECTION_LABELS,
  POST_MOSAIC_EVENTOS_SUBGROUPS,
  getPostEventosSubgroup,
  resolvePostCategoria,
} from "@/lib/postCategories";
import { formatPostCount } from "@/hooks/usePostCategoryCounts";
import { getPostCategoryPath } from "@/lib/postsNavPath";
import { cn } from "@/lib/utils";

function PostCategoryTile({ categoryKey, index, count, countsLoading }) {
  const label = POST_FEED_SECTION_LABELS[categoryKey];
  const image = POST_CATEGORIA_MOSAIC_THUMBS[categoryKey];
  const mosaicTag =
    getPostEventosSubgroup(categoryKey) || POST_CATEGORIA_MOSAIC_TAG[categoryKey];
  const countLabel = countsLoading ? "…" : formatPostCount(count);
  const href = getPostCategoryPath(categoryKey);

  return (
    <Link
      to={href}
      className={cn(
        "post-category-tile group focus-ring",
        `post-category-tile--${categoryKey}`,
        mosaicTag && `post-category-tile--tag-${mosaicTag.id}`,
      )}
    >
      <div className="post-category-tile__media" aria-hidden>
        <SafeImg
          src={image}
          alt=""
          className="post-category-tile__img"
          loading={index < 4 ? "eager" : "lazy"}
          fetchPriority={index < 2 ? "high" : "low"}
          decoding="async"
        />
        <div className="post-category-tile__overlay" />
        <div className="post-category-tile__vignette" />
      </div>
      <div className="post-category-tile__content">
        <h2 className="post-category-tile__title">{label}</h2>
        <p className="post-category-tile__meta">{countLabel}</p>
      </div>
      <div className="post-category-tile__shine" aria-hidden />
    </Link>
  );
}

function toggleSubgroupSelection(selectedIds, allIds, id) {
  const base = selectedIds.size > 0 ? selectedIds : new Set(allIds);
  const next = new Set(base);
  if (next.has(id)) {
    if (next.size <= 1) return next;
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

/**
 * Hub Eventos: mosaico de categorias + filtro por subgrupo (todos activos por defeito).
 * @param {{ posts: object[]; isLoading?: boolean }} props
 */
export default function PostsEventosGroupView({ posts, isLoading = false }) {
  const subgroupIds = useMemo(
    () => POST_MOSAIC_EVENTOS_SUBGROUPS.map((subgroup) => subgroup.id),
    [],
  );
  const [selectedSubgroups, setSelectedSubgroups] = useState(() => new Set());
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  useEffect(() => {
    if (filtersInitialized || subgroupIds.length === 0) return;
    setSelectedSubgroups(new Set(subgroupIds));
    setFiltersInitialized(true);
  }, [subgroupIds, filtersInitialized]);

  const activeSubgroups =
    selectedSubgroups.size > 0 ? selectedSubgroups : new Set(subgroupIds);

  const categoryCounts = useMemo(() => {
    const map = Object.fromEntries(
      POST_MOSAIC_EVENTOS_SUBGROUPS.flatMap((subgroup) =>
        subgroup.categories.map((key) => [key, 0]),
      ),
    );

    for (const post of posts) {
      const cat = resolvePostCategoria(post);
      if (!cat || map[cat] === undefined) continue;
      map[cat] += 1;
    }

    return map;
  }, [posts]);

  const visibleCategories = useMemo(() => {
    const keys = POST_MOSAIC_EVENTOS_SUBGROUPS.flatMap((subgroup) =>
      activeSubgroups.has(subgroup.id) ? subgroup.categories : [],
    );
    return keys.sort((a, b) =>
      (POST_FEED_SECTION_LABELS[a] || a).localeCompare(
        POST_FEED_SECTION_LABELS[b] || b,
        "pt-BR",
        { sensitivity: "base" },
      ),
    );
  }, [activeSubgroups]);

  const toggleSubgroup = (id) => {
    setSelectedSubgroups((prev) =>
      toggleSubgroupSelection(prev, subgroupIds, id),
    );
  };

  const selectAllSubgroups = () => {
    setSelectedSubgroups(new Set(subgroupIds));
  };

  return (
    <>
      <PostsEventosSubgroupFilterBar
        subgroups={POST_MOSAIC_EVENTOS_SUBGROUPS}
        selectedIds={activeSubgroups}
        onToggle={toggleSubgroup}
        onSelectAll={selectAllSubgroups}
      />

      {visibleCategories.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhuma categoria seleccionada"
          description="Seleccione pelo menos uma categoria ou toque em «Todos»."
        />
      ) : (
        <div className="posts-category-grid posts-category-grid--eventos-hub">
          {visibleCategories.map((key, index) => (
            <PostCategoryTile
              key={key}
              categoryKey={key}
              index={index}
              count={categoryCounts[key] ?? 0}
              countsLoading={isLoading}
            />
          ))}
        </div>
      )}
    </>
  );
}

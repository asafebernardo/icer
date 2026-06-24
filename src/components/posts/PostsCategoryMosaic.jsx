import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

import SafeImg from "@/components/shared/SafeImg";
import EmptyState from "@/components/shared/EmptyState";
import { usePostsList } from "@/hooks/usePostsList";
import {
  POST_CATEGORIA_MOSAIC_TAG,
  POST_CATEGORIA_MOSAIC_THUMBS,
  POST_FEED_SECTION_LABELS,
  POST_MOSAIC_EVENTOS_SUBGROUPS,
  getPostEventosSubgroup,
  getPostMosaicGroup,
  isEventosYearFirstGroup,
  resolvePostCategoria,
} from "@/lib/postCategories";
import {
  formatPostCount,
  usePostCategoryCounts,
} from "@/hooks/usePostCategoryCounts";
import { getPostPublicationYear, normalizePost, postYearToQueryValue } from "@/lib/posts";
import { getPostCategoryPath } from "@/lib/postsNavPath";
import { cn } from "@/lib/utils";

function PostCategoryTile({
  categoryKey,
  index,
  counts,
  countsLoading,
  year,
}) {
  const label = POST_FEED_SECTION_LABELS[categoryKey];
  const image = POST_CATEGORIA_MOSAIC_THUMBS[categoryKey];
  const count = counts[categoryKey] ?? 0;
  const mosaicTag =
    getPostEventosSubgroup(categoryKey) || POST_CATEGORIA_MOSAIC_TAG[categoryKey];
  const countLabel = countsLoading ? "…" : formatPostCount(count);
  const href =
    year !== undefined
      ? getPostCategoryPath(categoryKey, {
          search: `ano=${encodeURIComponent(postYearToQueryValue(year))}`,
        })
      : getPostCategoryPath(categoryKey);

  const tileClassName = cn(
    "post-category-tile group focus-ring",
    `post-category-tile--${categoryKey}`,
    mosaicTag && `post-category-tile--tag-${mosaicTag.id}`,
  );

  const content = (
    <>
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
    </>
  );

  return (
    <Link to={href} className={tileClassName}>
      {content}
    </Link>
  );
}

function CategoryGrid({
  categories,
  counts,
  countsLoading,
  year,
  indexOffset = 0,
  variant = "default",
}) {
  return (
    <div
      className={cn(
        "posts-category-grid",
        variant === "informacoes"
          ? "posts-category-grid--informacoes"
          : "posts-category-grid--categories",
      )}
    >
      {categories.map((key, index) => (
        <PostCategoryTile
          key={key}
          categoryKey={key}
          index={indexOffset + index}
          counts={counts}
          countsLoading={countsLoading}
          year={year}
        />
      ))}
    </div>
  );
}

function EventosYearCategoryMosaic({ year }) {
  const { posts, isLoading: postsLoading } = usePostsList();

  const yearCounts = useMemo(() => {
    const map = Object.fromEntries(
      POST_MOSAIC_EVENTOS_SUBGROUPS.flatMap((subgroup) =>
        subgroup.categories.map((key) => [key, 0]),
      ),
    );

    for (const post of posts) {
      const cat = resolvePostCategoria(post);
      if (!cat || map[cat] === undefined) continue;
      if (getPostPublicationYear(normalizePost(post)) !== year) continue;
      map[cat] += 1;
    }

    return map;
  }, [posts, year]);

  const countsLoading = postsLoading;

  return (
    <div className="posts-category-mosaic-stack">
      {POST_MOSAIC_EVENTOS_SUBGROUPS.map((subgroup, groupIndex) => {
        let tileIndex = 0;
        for (let i = 0; i < groupIndex; i += 1) {
          tileIndex += POST_MOSAIC_EVENTOS_SUBGROUPS[i].categories.length;
        }

        return (
          <section
            key={subgroup.id}
            className={cn(
              "posts-category-mosaic-group",
              groupIndex > 0 && "posts-category-mosaic-group--break",
            )}
            aria-labelledby={`eventos-subgroup-${subgroup.id}-${year ?? "all"}`}
          >
            <h3
              id={`eventos-subgroup-${subgroup.id}-${year ?? "all"}`}
              className="posts-category-mosaic-group__title posts-category-mosaic-group__title--solo"
            >
              {subgroup.label}
            </h3>

            <CategoryGrid
              categories={subgroup.categories}
              counts={yearCounts}
              countsLoading={countsLoading}
              year={year}
              indexOffset={tileIndex}
            />
          </section>
        );
      })}
    </div>
  );
}

/** Mosaico de categorias dentro de um grupo (ex.: Informações ou Eventos › ano). */
export default function PostsCategoryMosaic({ groupId, year }) {
  const { counts, isLoading: countsLoading } = usePostCategoryCounts();
  const group = getPostMosaicGroup(groupId);
  const showEventosSubgroups =
    isEventosYearFirstGroup(groupId) && year !== undefined;

  const categories = useMemo(() => {
    if (!group) return [];
    return group.categories;
  }, [group]);

  if (!group) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Grupo não encontrado"
        description="Volte ao índice de Posts."
      />
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhuma categoria"
        description={`Não há categorias em «${group.label}».`}
      />
    );
  }

  if (showEventosSubgroups) {
    return <EventosYearCategoryMosaic year={year} />;
  }

  return (
    <CategoryGrid
      categories={categories}
      counts={counts}
      countsLoading={countsLoading}
      year={year}
      variant={groupId === "informacoes" ? "informacoes" : "default"}
    />
  );
}

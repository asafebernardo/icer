import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

import SafeImg from "@/components/shared/SafeImg";
import EmptyState from "@/components/shared/EmptyState";
import {
  POST_CATEGORIA_MOSAIC_TAG,
  POST_CATEGORIA_MOSAIC_THUMBS,
  POST_FEED_SECTION_LABELS,
  getPostMosaicGroup,
  isOficiaisCategoryNavigationBlocked,
} from "@/lib/postCategories";
import {
  formatPostCount,
  usePostCategoryCounts,
} from "@/hooks/usePostCategoryCounts";
import { cn } from "@/lib/utils";

function PostCategoryTile({
  categoryKey,
  index,
  counts,
  countsLoading,
  navigationBlocked = false,
}) {
  const label = POST_FEED_SECTION_LABELS[categoryKey];
  const image = POST_CATEGORIA_MOSAIC_THUMBS[categoryKey];
  const count = counts[categoryKey] ?? 0;
  const mosaicTag = POST_CATEGORIA_MOSAIC_TAG[categoryKey];
  const countLabel = countsLoading ? "…" : formatPostCount(count);

  const tileClassName = cn(
    "post-category-tile group",
    !navigationBlocked && "focus-ring",
    `post-category-tile--${categoryKey}`,
    mosaicTag && `post-category-tile--tag-${mosaicTag.id}`,
    navigationBlocked && "post-category-tile--nav-blocked",
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

  if (navigationBlocked) {
    return (
      <article
        className={tileClassName}
        aria-label={`${label} — indisponível`}
        aria-disabled="true"
      >
        {content}
      </article>
    );
  }

  return (
    <Link to={`/Posts/categoria/${categoryKey}`} className={tileClassName}>
      {content}
    </Link>
  );
}

/** Mosaico de categorias dentro de um grupo (ex.: Oficiais → Culto, Ceia, Oração). */
export default function PostsCategoryMosaic({ groupId }) {
  const { counts, isLoading: countsLoading } = usePostCategoryCounts();
  const group = getPostMosaicGroup(groupId);

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

  return (
    <div className="posts-category-grid posts-category-grid--categories">
      {categories.map((key, index) => (
        <PostCategoryTile
          key={key}
          categoryKey={key}
          index={index}
          counts={counts}
          countsLoading={countsLoading}
          navigationBlocked={isOficiaisCategoryNavigationBlocked(key)}
        />
      ))}
    </div>
  );
}

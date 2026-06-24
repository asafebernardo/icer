import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

import SafeImg from "@/components/shared/SafeImg";
import EmptyState from "@/components/shared/EmptyState";
import {
  POST_CATEGORIA_MOSAIC_TAG,
  POST_CATEGORIA_MOSAIC_THUMBS,
  POST_FEED_SECTION_LABELS,
  POST_MOSAIC_TAG_GROUPS,
} from "@/lib/postCategories";
import {
  formatPostCount,
  usePostCategoryCounts,
} from "@/hooks/usePostCategoryCounts";
import { cn } from "@/lib/utils";

export default function PostsCategoryMosaic({ tagFilter = "all" }) {
  const { counts, visibleCategories, isLoading: countsLoading } =
    usePostCategoryCounts();

  const filteredCategories = useMemo(() => {
    if (tagFilter === "all") return visibleCategories;
    return visibleCategories.filter(
      (key) => POST_CATEGORIA_MOSAIC_TAG[key]?.id === tagFilter,
    );
  }, [visibleCategories, tagFilter]);

  const emptyLabel =
    POST_MOSAIC_TAG_GROUPS.find((g) => g.id === tagFilter)?.label ?? tagFilter;

  if (filteredCategories.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhuma categoria"
        description={`Não há categorias na tag «${emptyLabel}».`}
      />
    );
  }

  return (
    <div className="posts-category-grid">
      {filteredCategories.map((key, index) => {
        const label = POST_FEED_SECTION_LABELS[key];
        const image = POST_CATEGORIA_MOSAIC_THUMBS[key];
        const count = counts[key] ?? 0;
        const mosaicTag = POST_CATEGORIA_MOSAIC_TAG[key];
        const countLabel = countsLoading ? "…" : formatPostCount(count);

        return (
          <Link
            key={key}
            to={`/Posts/categoria/${key}`}
            className={cn(
              "post-category-tile group focus-ring",
              `post-category-tile--${key}`,
              mosaicTag && `post-category-tile--tag-${mosaicTag.id}`,
            )}
          >
            {mosaicTag ? (
              <span
                className={cn(
                  "post-category-tile__tag",
                  `post-category-tile__tag--${mosaicTag.id}`,
                )}
              >
                {mosaicTag.label}
              </span>
            ) : null}

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
      })}
    </div>
  );
}

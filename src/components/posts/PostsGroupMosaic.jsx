import { Link } from "react-router-dom";

import SafeImg from "@/components/shared/SafeImg";
import {
  POST_CATEGORIA_MOSAIC_THUMBS,
  POST_MOSAIC_TAG_GROUPS,
} from "@/lib/postCategories";
import { formatPostCount, usePostCategoryCounts } from "@/hooks/usePostCategoryCounts";
import { cn } from "@/lib/utils";

function groupThumb(group) {
  for (const key of group.categories) {
    const url = POST_CATEGORIA_MOSAIC_THUMBS[key];
    if (url) return url;
  }
  return POST_CATEGORIA_MOSAIC_THUMBS.noticias;
}

function groupCount(group, counts) {
  return group.categories.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
}

export default function PostsGroupMosaic() {
  const { counts, isLoading: countsLoading } = usePostCategoryCounts();

  return (
    <div className="posts-category-grid posts-category-grid--groups">
      {POST_MOSAIC_TAG_GROUPS.map((group, index) => {
        const count = groupCount(group, counts);
        const countLabel = countsLoading ? "…" : formatPostCount(count);
        const image = groupThumb(group);

        return (
          <Link
            key={group.id}
            to={`/Posts/grupo/${group.id}`}
            className={cn(
              "post-category-tile post-group-tile group focus-ring",
              `post-category-tile--tag-${group.id}`,
            )}
            aria-label={`Abrir categorias de ${group.label} (${countLabel})`}
          >
            <div className="post-category-tile__media" aria-hidden>
              <SafeImg
                src={image}
                alt=""
                className="post-category-tile__img"
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "low"}
                decoding="async"
              />
              <div className="post-category-tile__overlay" />
              <div className="post-category-tile__vignette" />
            </div>

            <div className="post-category-tile__content">
              <h2 className="post-category-tile__title">{group.label}</h2>
              <p className="post-category-tile__meta">
                {group.categories.length}{" "}
                {group.categories.length === 1 ? "categoria" : "categorias"}
                <span className="mx-1.5 opacity-50">·</span>
                {countLabel}
              </p>
            </div>

            <div className="post-category-tile__shine" aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}

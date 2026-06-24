import { useMemo } from "react";

import PostFeedCard from "./PostFeedCard";
import PostPublicationDateCard from "./PostPublicationDateCard";
import PostYearGroupCard from "./PostYearGroupCard";
import {
  POST_CATEGORIA_MOSAIC_THUMBS,
  categoryOpensPostDirectlyOnYearClick,
} from "@/lib/postCategories";
import {
  groupPostsByPublicationYear,
  POST_CATEGORY_PRESET_YEARS,
} from "@/lib/posts";

function PostYearTileSkeleton() {
  return (
    <div className="post-category-tile post-category-tile--skeleton post-year-group-tile h-[272px] rounded-[20px] sm:h-[320px] md:h-[360px] lg:h-[400px]" />
  );
}

function PostListItemSkeleton() {
  return (
    <div className="h-[72px] animate-pulse rounded-[10px] bg-white/[0.04]" />
  );
}

export function PostsCategoryFeedSkeleton({ count = 6, variant = "mosaic" } = {}) {
  if (variant === "list") {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
          <PostListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  const gridClass =
    variant === "dateMosaic"
      ? "posts-category-grid posts-category-grid--dates"
      : "posts-category-grid posts-category-grid--years";

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <PostYearTileSkeleton key={i} />
      ))}
    </div>
  );
}

export function PostsCategoryPostList({
  posts,
  location,
  categoryKey,
  year,
  canEdit,
  canDelete,
  onDelete,
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {posts.map((post) => (
        <li key={post.id} className="min-w-0">
          <PostFeedCard
            post={post}
            location={location}
            categoryKey={categoryKey}
            year={year}
            canEdit={canEdit}
            canDelete={canDelete}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  );
}

export function PostsCategoryDateMosaicList({
  posts,
  location,
  categoryKey,
  canEdit,
  canDelete,
  onDelete,
}) {
  const fallbackThumb = POST_CATEGORIA_MOSAIC_THUMBS[categoryKey] || null;

  return (
    <div className="posts-category-grid posts-category-grid--dates">
      {posts.map((post) => (
        <PostPublicationDateCard
          key={post.id}
          post={post}
          location={location}
          fallbackThumb={fallbackThumb}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export function PostsCategoryYearMosaic({
  posts,
  categoryPath,
  categoryKey,
  location,
}) {
  const yearGroups = useMemo(
    () =>
      groupPostsByPublicationYear(posts, {
        presetYears: POST_CATEGORY_PRESET_YEARS,
      }),
    [posts],
  );
  const fallbackThumb = POST_CATEGORIA_MOSAIC_THUMBS[categoryKey] || null;
  const opensPostDirectly = categoryOpensPostDirectlyOnYearClick(categoryKey);

  return (
    <div className="posts-category-grid posts-category-grid--years">
      {yearGroups.map((group) => (
        <PostYearGroupCard
          key={group.year ?? "sem-data"}
          year={group.year}
          posts={group.posts}
          categoryPath={categoryPath}
          location={location}
          fallbackThumb={fallbackThumb}
          opensPostDirectly={opensPostDirectly}
        />
      ))}
    </div>
  );
}

/** Mosaico de anos no grupo Eventos (antes das 16 categorias). */
export function PostsGroupYearMosaic({ posts, groupPath, location }) {
  const yearGroups = useMemo(
    () =>
      groupPostsByPublicationYear(posts, {
        presetYears: POST_CATEGORY_PRESET_YEARS,
      }),
    [posts],
  );
  const fallbackThumb = POST_CATEGORIA_MOSAIC_THUMBS.culto_dominical || null;

  return (
    <div className="posts-category-grid posts-category-grid--years">
      {yearGroups.map((group) => (
        <PostYearGroupCard
          key={group.year ?? "sem-data"}
          year={group.year}
          posts={group.posts}
          categoryPath={groupPath}
          location={location}
          fallbackThumb={fallbackThumb}
          opensPostDirectly={false}
        />
      ))}
    </div>
  );
}

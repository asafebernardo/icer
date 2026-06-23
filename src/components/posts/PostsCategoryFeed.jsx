import PostYearMosaicCard from "./PostYearMosaicCard";

function PostYearTileSkeleton() {
  return (
    <div className="post-category-tile post-category-tile--skeleton h-[200px] rounded-[20px] sm:h-[210px]" />
  );
}

export function PostsCategoryFeedSkeleton({ count = 6 } = {}) {
  return (
    <div className="posts-category-grid">
      {Array.from({ length: count }).map((_, i) => (
        <PostYearTileSkeleton key={i} />
      ))}
    </div>
  );
}

export default function PostsCategoryFeed({
  posts,
  location,
  canEdit,
  canDelete,
  onDelete,
}) {
  return (
    <div className="posts-category-grid">
      {posts.map((post) => (
        <PostYearMosaicCard
          key={post.id}
          post={post}
          location={location}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

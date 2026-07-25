import PostFeedCard from "./PostFeedCard";

export default function PostsFeedSection({
  section,
  location,
  canEdit,
  canDelete,
  onDelete,
}) {
  return (
    <section className="posts-feed-section" aria-labelledby={`feed-sec-${section.key}`}>
      <div className="posts-section-head">
        <h2 id={`feed-sec-${section.key}`} className="posts-section-label">
          {section.label}
        </h2>
      </div>

      <ul className="posts-feed-grid">
        {section.items.map((post) => (
          <li key={post.id} className="min-w-0">
            <PostFeedCard
              post={post}
              location={location}
              hideCategory
              canEdit={canEdit}
              canDelete={canDelete}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

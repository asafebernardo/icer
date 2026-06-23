import PostsFeedSection from "./PostsFeedSection";

export default function PostsFeed({
  sections,
  location,
  canEdit,
  canDelete,
  onDelete,
}) {
  return (
    <div className="flex flex-col">
      {sections.map((section) => (
        <PostsFeedSection
          key={section.key}
          section={section}
          location={location}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

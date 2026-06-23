import { POST_MOSAIC_TAG_GROUPS } from "@/lib/postCategories";
import { cn } from "@/lib/utils";

function TagFilterPill({ active, groupId, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "posts-hub-tag-pill shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
        active && groupId && `posts-hub-tag-pill--active-${groupId}`,
        active && !groupId && "posts-hub-tag-pill--active-all",
        !active && "posts-hub-tag-pill--idle",
      )}
    >
      {children}
    </button>
  );
}

export default function PostsHubHeader({
  selectedTag = "all",
  onTagChange,
  actions = null,
}) {
  return (
    <header className="posts-hub-header">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#38BDF8]/75">
            Comunidade
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#F1F5F9] sm:text-[1.75rem]">
            Posts
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B] sm:text-[0.9375rem]">
            Cultos, estudos, eventos especiais e notícias da igreja — organize
            por categoria e encontre publicações por ano.
          </p>
        </div>

        {actions ? (
          <div className="shrink-0 sm:pt-1">{actions}</div>
        ) : null}
      </div>

      <div
        className="mt-5 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filtrar por tag"
      >
        <TagFilterPill
          active={selectedTag === "all"}
          onClick={() => onTagChange("all")}
        >
          Todos
        </TagFilterPill>
        {POST_MOSAIC_TAG_GROUPS.map((group) => (
          <TagFilterPill
            key={group.id}
            groupId={group.id}
            active={selectedTag === group.id}
            onClick={() => onTagChange(group.id)}
          >
            {group.label}
          </TagFilterPill>
        ))}
      </div>
    </header>
  );
}

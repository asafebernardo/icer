import { cn } from "@/lib/utils";

const ACTIVE_PILL_CLASS = {
  oficiais: "posts-hub-tag-pill--active-oficiais",
  festividade: "posts-hub-tag-pill--active-festividade",
  encontros: "posts-hub-tag-pill--active-encontros",
  especiais: "posts-hub-tag-pill--active-especiais",
};

/**
 * Filtro por subgrupo de categorias (Oficiais, Festividade, …).
 * @param {{
 *   subgroups: Array<{ id: string, label: string }>;
 *   selectedIds: Set<string>;
 *   onToggle: (id: string) => void;
 *   onSelectAll: () => void;
 *   className?: string;
 * }} props
 */
export default function PostsEventosSubgroupFilterBar({
  subgroups,
  selectedIds,
  onToggle,
  onSelectAll,
  className,
}) {
  const allSelected =
    subgroups.length > 0 && selectedIds.size === subgroups.length;

  if (subgroups.length === 0) return null;

  return (
    <div
      className={cn(
        "posts-eventos-filters mb-8 flex flex-wrap items-center justify-center gap-2",
        className,
      )}
      role="group"
      aria-label="Filtrar por categoria"
    >
      <button
        type="button"
        onClick={onSelectAll}
        aria-pressed={allSelected}
        className={cn(
          "posts-hub-tag-pill focus-ring posts-hub-tag-pill--idle",
          allSelected && "posts-hub-tag-pill--active-all",
        )}
      >
        Todos
      </button>
      {subgroups.map((subgroup) => {
        const active = selectedIds.has(subgroup.id);
        return (
          <button
            key={subgroup.id}
            type="button"
            onClick={() => onToggle(subgroup.id)}
            aria-pressed={active}
            className={cn(
              "posts-hub-tag-pill focus-ring",
              active
                ? ACTIVE_PILL_CLASS[subgroup.id] ||
                    "posts-hub-tag-pill--active-all"
                : "posts-hub-tag-pill--idle",
            )}
          >
            {subgroup.label}
          </button>
        );
      })}
    </div>
  );
}

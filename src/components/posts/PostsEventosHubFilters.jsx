import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  POST_FEED_SECTION_LABELS,
  POST_MOSAIC_EVENTOS_SUBGROUPS,
} from "@/lib/postCategories";
import { getPostsFilterYears } from "@/lib/postsYearFilter";
import { cn } from "@/lib/utils";

export const POSTS_EVENTOS_ALL_CARDS = "__all__";
export const POSTS_EVENTOS_ALL_YEARS = "__all_years__";

const SUBGROUP_ACTIVE_CLASS = {
  oficiais: "posts-hub-tag-pill--active-oficiais",
  festividade: "posts-hub-tag-pill--active-festividade",
  encontros: "posts-hub-tag-pill--active-encontros",
  especiais: "posts-hub-tag-pill--active-especiais",
};

/**
 * Campo de pesquisa (toolbar).
 */
export function PostsEventosHubSearch({
  searchQuery,
  onSearchChange,
  className,
}) {
  return (
    <div
      className={cn(
        "relative min-w-0 flex-1 sm:max-w-xs",
        className,
      )}
    >
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id="posts-eventos-search"
        type="search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Pesquisar…"
        aria-label="Pesquisar publicações"
        className="h-8 border-white/10 bg-background/40 pl-8 text-xs sm:text-sm"
      />
    </div>
  );
}

function FilterSection({ label, children, className }) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function ScrollChipRow({ children, ariaLabel }) {
  return (
    <div
      className="-mx-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="flex min-w-min flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function PostsEventosHubFilterContent({
  posts,
  selectedSubgroup,
  onSubgroupChange,
  selectedCard,
  onCardChange,
  selectedYear,
  onYearChange,
  onClearFilters,
  filtersActive = false,
  className,
}) {
  const availableYears = useMemo(() => getPostsFilterYears(posts), [posts]);

  const categoriesInSubgroup = useMemo(() => {
    if (!selectedSubgroup) return [];
    const subgroup = POST_MOSAIC_EVENTOS_SUBGROUPS.find(
      (item) => item.id === selectedSubgroup,
    );
    if (!subgroup) return [];
    return subgroup.categories
      .map((key) => ({
        key,
        label: POST_FEED_SECTION_LABELS[key] || key,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
      );
  }, [selectedSubgroup]);

  const handleSubgroupClick = (subgroupId) => {
    if (selectedSubgroup === subgroupId) {
      onSubgroupChange(null);
      onCardChange(POSTS_EVENTOS_ALL_CARDS);
      return;
    }
    onSubgroupChange(subgroupId);
    onCardChange(POSTS_EVENTOS_ALL_CARDS);
  };

  const handleCategoryClick = (categoryKey) => {
    onCardChange(
      selectedCard === categoryKey ? POSTS_EVENTOS_ALL_CARDS : categoryKey,
    );
  };

  const handleYearClick = (year) => {
    const value = String(year);
    onYearChange(selectedYear === value ? POSTS_EVENTOS_ALL_YEARS : value);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {filtersActive ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden />
            Limpar filtros
          </button>
        </div>
      ) : null}

      <FilterSection label="Categoria">
        <ScrollChipRow ariaLabel="Filtrar por categoria">
          <button
            type="button"
            onClick={() => {
              onSubgroupChange(null);
              onCardChange(POSTS_EVENTOS_ALL_CARDS);
            }}
            aria-pressed={
              !selectedSubgroup && selectedCard === POSTS_EVENTOS_ALL_CARDS
            }
            className={cn(
              "posts-hub-tag-pill focus-ring posts-hub-tag-pill--idle",
              !selectedSubgroup &&
                selectedCard === POSTS_EVENTOS_ALL_CARDS &&
                "posts-hub-tag-pill--active-all",
            )}
          >
            Todos
          </button>
          {POST_MOSAIC_EVENTOS_SUBGROUPS.map((subgroup) => {
            const active =
              selectedSubgroup === subgroup.id &&
              selectedCard === POSTS_EVENTOS_ALL_CARDS;
            return (
              <button
                key={subgroup.id}
                type="button"
                onClick={() => handleSubgroupClick(subgroup.id)}
                aria-pressed={active}
                className={cn(
                  "posts-hub-tag-pill focus-ring",
                  active
                    ? SUBGROUP_ACTIVE_CLASS[subgroup.id] ||
                        "posts-hub-tag-pill--active-all"
                    : "posts-hub-tag-pill--idle",
                )}
              >
                {subgroup.label}
              </button>
            );
          })}
        </ScrollChipRow>
      </FilterSection>

      {selectedSubgroup && categoriesInSubgroup.length > 0 ? (
        <FilterSection label="Tipo específico">
          <ScrollChipRow ariaLabel="Filtrar por tipo de evento">
            <button
              type="button"
              onClick={() => onCardChange(POSTS_EVENTOS_ALL_CARDS)}
              aria-pressed={selectedCard === POSTS_EVENTOS_ALL_CARDS}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                selectedCard === POSTS_EVENTOS_ALL_CARDS
                  ? "border-accent/40 bg-accent/20 text-accent"
                  : "border-white/10 bg-background/40 text-muted-foreground hover:border-accent/30 hover:text-foreground",
              )}
            >
              Todos
            </button>
            {categoriesInSubgroup.map((option) => {
              const active = selectedCard === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleCategoryClick(option.key)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-accent/40 bg-accent/20 text-accent"
                      : "border-white/10 bg-background/40 text-muted-foreground hover:border-accent/30 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </ScrollChipRow>
        </FilterSection>
      ) : null}

      {availableYears.length > 0 ? (
        <FilterSection label="Ano">
          <ScrollChipRow ariaLabel="Filtrar por ano">
            <button
              type="button"
              onClick={() => onYearChange(POSTS_EVENTOS_ALL_YEARS)}
              aria-pressed={selectedYear === POSTS_EVENTOS_ALL_YEARS}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                selectedYear === POSTS_EVENTOS_ALL_YEARS
                  ? "border-accent/40 bg-accent/20 text-accent"
                  : "border-white/10 bg-background/40 text-muted-foreground hover:border-accent/30 hover:text-foreground",
              )}
            >
              Todos
            </button>
            {availableYears.map((year) => {
              const active = selectedYear === String(year);
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearClick(year)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-accent/40 bg-accent/20 text-accent"
                      : "border-white/10 bg-background/40 text-muted-foreground hover:border-accent/30 hover:text-foreground",
                  )}
                >
                  {year}
                </button>
              );
            })}
          </ScrollChipRow>
        </FilterSection>
      ) : null}
    </div>
  );
}

function countActiveFilters({
  selectedSubgroup,
  selectedCard,
  selectedYear,
}) {
  let count = 0;
  if (selectedCard !== POSTS_EVENTOS_ALL_CARDS || selectedSubgroup) count += 1;
  if (selectedYear !== POSTS_EVENTOS_ALL_YEARS) count += 1;
  return count;
}

/**
 * Botão que abre filtros num painel inferior (não ocupa a página fechado).
 */
export function PostsEventosHubFilterTrigger({
  posts,
  selectedSubgroup,
  onSubgroupChange,
  selectedCard,
  onCardChange,
  selectedYear,
  onYearChange,
  onClearFilters,
  filtersActive = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters({
    selectedSubgroup,
    selectedCard,
    selectedYear,
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls="posts-eventos-filter-sheet"
        onClick={() => setOpen(true)}
        className={cn(
          "h-8 shrink-0 gap-1.5 border-white/10 bg-background/40 px-2.5 text-xs",
          activeCount > 0 && "border-accent/35 text-accent",
          className,
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        <span>Filtros</span>
        {activeCount > 0 ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
            {activeCount}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          id="posts-eventos-filter-sheet"
          side="bottom"
          className="max-h-[min(78vh,32rem)] overflow-y-auto rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5"
        >
          <SheetHeader className="mb-4 space-y-1 text-left">
            <SheetTitle className="text-base">Filtrar eventos</SheetTitle>
          </SheetHeader>
          <PostsEventosHubFilterContent
            posts={posts}
            selectedSubgroup={selectedSubgroup}
            onSubgroupChange={onSubgroupChange}
            selectedCard={selectedCard}
            onCardChange={onCardChange}
            selectedYear={selectedYear}
            onYearChange={onYearChange}
            onClearFilters={onClearFilters}
            filtersActive={filtersActive}
          />
          <div className="sticky bottom-0 mt-4 border-t border-border/80 bg-background pt-3">
            <Button
              type="button"
              className="w-full"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Ver resultados
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Resumo compacto dos filtros activos (uma linha).
 */
export function PostsEventosHubActiveFilters({
  selectedSubgroup,
  onSubgroupChange,
  selectedCard,
  onCardChange,
  selectedYear,
  onYearChange,
  onClearFilters,
  className,
}) {
  const chips = useMemo(() => {
    const items = [];

    if (selectedCard !== POSTS_EVENTOS_ALL_CARDS) {
      items.push({
        key: "card",
        label: POST_FEED_SECTION_LABELS[selectedCard] || selectedCard,
        onRemove: () => onCardChange(POSTS_EVENTOS_ALL_CARDS),
      });
    } else if (selectedSubgroup) {
      const subgroup = POST_MOSAIC_EVENTOS_SUBGROUPS.find(
        (item) => item.id === selectedSubgroup,
      );
      if (subgroup) {
        items.push({
          key: "subgroup",
          label: subgroup.label,
          onRemove: () => {
            onSubgroupChange(null);
            onCardChange(POSTS_EVENTOS_ALL_CARDS);
          },
        });
      }
    }

    if (selectedYear !== POSTS_EVENTOS_ALL_YEARS) {
      items.push({
        key: "year",
        label: String(selectedYear),
        onRemove: () => onYearChange(POSTS_EVENTOS_ALL_YEARS),
      });
    }

    return items;
  }, [
    selectedSubgroup,
    selectedCard,
    selectedYear,
    onSubgroupChange,
    onCardChange,
    onYearChange,
  ]);

  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-4 flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:thin]",
        className,
      )}
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/15"
        >
          {chip.label}
          <X className="h-3 w-3 opacity-70" aria-hidden />
          <span className="sr-only">Remover filtro {chip.label}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearFilters}
        className="shrink-0 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Limpar
      </button>
    </div>
  );
}

export default PostsEventosHubSearch;

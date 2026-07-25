import { useMemo } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  POST_FEED_SECTION_LABELS,
  POST_MOSAIC_EVENTOS_SUBGROUPS,
} from "@/lib/postCategories";
import { getPostsFilterYears } from "@/lib/postsYearFilter";
import { cn } from "@/lib/utils";

export const POSTS_EVENTOS_ALL_CARDS = "__all__";
export const POSTS_EVENTOS_ALL_YEARS = "__all_years__";

const selectClass = "h-8 border-white/10 bg-background/40 text-xs";

/**
 * Campo de pesquisa (esquerda da toolbar).
 */
export function PostsEventosHubSearch({
  searchQuery,
  onSearchChange,
  className,
}) {
  return (
    <div className={cn("relative min-w-0 w-[min(100%,14rem)] sm:w-52", className)}>
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
        className="h-8 border-white/10 bg-background/40 pl-8 text-xs"
      />
    </div>
  );
}

/**
 * Selects Ano + Card (direita da toolbar).
 */
export function PostsEventosHubSelectFilters({
  posts,
  selectedYear,
  onYearChange,
  selectedCard,
  onCardChange,
  className,
}) {
  const availableYears = useMemo(() => getPostsFilterYears(posts), [posts]);

  const cardOptions = useMemo(() => {
    const keys = POST_MOSAIC_EVENTOS_SUBGROUPS.flatMap(
      (subgroup) => subgroup.categories,
    );
    return keys
      .map((key) => ({
        key,
        label: POST_FEED_SECTION_LABELS[key] || key,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
      );
  }, []);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <label
          htmlFor="posts-eventos-year-filter"
          className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        >
          Ano
        </label>
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger
            id="posts-eventos-year-filter"
            className={cn(selectClass, "w-[9.5rem] sm:w-36")}
            aria-label="Filtrar por ano"
          >
            <SelectValue placeholder="Todos os anos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={POSTS_EVENTOS_ALL_YEARS}>Todos os anos</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <label
          htmlFor="posts-eventos-card-filter"
          className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        >
          Card
        </label>
        <Select value={selectedCard} onValueChange={onCardChange}>
          <SelectTrigger
            id="posts-eventos-card-filter"
            className={cn(selectClass, "w-[12rem] sm:w-44")}
            aria-label="Filtrar por tipo de evento"
          >
            <SelectValue placeholder="Todos os eventos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={POSTS_EVENTOS_ALL_CARDS}>Todos os eventos</SelectItem>
            {cardOptions.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default PostsEventosHubSearch;

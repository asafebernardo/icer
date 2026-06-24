import { getPostPublicationYear, normalizePost, POST_CATEGORY_PRESET_YEARS } from "@/lib/posts";

/** Anos disponíveis no filtro (presets + anos das publicações). */
export function getPostsFilterYears(posts) {
  const years = new Set(POST_CATEGORY_PRESET_YEARS);
  for (const post of Array.isArray(posts) ? posts : []) {
    const y = getPostPublicationYear(normalizePost(post));
    if (y != null) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * @param {object[]} posts
 * @param {Set<number | null>} selectedYears
 * @param {number[]} availableYears
 */
export function filterPostsBySelectedYears(posts, selectedYears, availableYears) {
  const active =
    selectedYears.size > 0 ? selectedYears : new Set(availableYears);
  const allSelected =
    availableYears.length > 0 && active.size >= availableYears.length;

  return (Array.isArray(posts) ? posts : []).filter((post) => {
    const year = getPostPublicationYear(normalizePost(post));
    if (year == null) return allSelected;
    return active.has(year);
  });
}

/** @param {Set<number | null>} selectedYears */
export function togglePostsFilterYear(selectedYears, availableYears, year) {
  const base = selectedYears.size > 0 ? selectedYears : new Set(availableYears);
  const next = new Set(base);
  if (next.has(year)) {
    if (next.size <= 1) return next;
    next.delete(year);
  } else {
    next.add(year);
  }
  return next;
}

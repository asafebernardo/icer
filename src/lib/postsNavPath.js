import {
  POST_CATEGORIA_LABELS,
  POST_FEED_SECTION_LABELS,
  categoryUsesYearPostList,
  getPostCategoryGroupId,
  getPostMosaicGroup,
  resolvePostCategoria,
} from "@/lib/postCategories";
import {
  categoryUsesYearMosaic,
  getPostPublicationYear,
  normalizePost,
  postYearToQueryValue,
} from "@/lib/posts";

/** @param {string} catKey */
export function getPostCategoryLabel(catKey) {
  const k = String(catKey || "").trim().toLowerCase();
  return POST_FEED_SECTION_LABELS[k] || POST_CATEGORIA_LABELS[k] || k;
}

/**
 * @param {{ groupId?: string | null, categoryKey?: string | null, year?: number | null, includeYear?: boolean, postTitle?: string | null }} opts
 * @returns {Array<{ label: string, href?: string | null }>}
 */
export function buildPostsNavPath({
  groupId,
  categoryKey,
  year,
  includeYear,
  postTitle,
} = {}) {
  /** @type {Array<{ label: string, href?: string | null }>} */
  const items = [{ label: "Posts", href: "/Posts" }];

  const catKey = String(categoryKey || "").trim().toLowerCase();
  const resolvedGroupId =
    String(groupId || "").trim().toLowerCase() ||
    (catKey ? getPostCategoryGroupId(catKey) : "");

  if (resolvedGroupId) {
    const group = getPostMosaicGroup(resolvedGroupId);
    if (group) {
      items.push({
        label: group.label,
        href: `/Posts/grupo/${encodeURIComponent(resolvedGroupId)}`,
      });
    }
  }

  if (catKey) {
    items.push({
      label: getPostCategoryLabel(catKey),
      href: `/Posts/categoria/${encodeURIComponent(catKey)}`,
    });

    const showYear =
      includeYear !== false &&
      categoryUsesYearMosaic(catKey) &&
      year !== undefined;

    if (showYear) {
      const yearHref = categoryUsesYearPostList(catKey)
        ? `/Posts/categoria/${encodeURIComponent(catKey)}?ano=${encodeURIComponent(postYearToQueryValue(year))}`
        : null;
      items.push({
        label: year == null ? "Sem data" : String(year),
        href: yearHref,
      });
    }
  }

  if (postTitle) {
    items.push({ label: String(postTitle).trim(), href: null });
  }

  return items;
}

/** @param {object | null | undefined} post */
export function buildPostsNavPathFromPost(post) {
  const p = normalizePost(post);
  const catKey = resolvePostCategoria(p) || "noticias";
  const year = categoryUsesYearMosaic(catKey)
    ? getPostPublicationYear(p)
    : undefined;
  return buildPostsNavPath({
    groupId: getPostCategoryGroupId(catKey),
    categoryKey: catKey,
    year,
    includeYear: year !== undefined && year !== null,
  });
}

/** @param {Array<{ label: string }>} items */
export function formatPostsNavPathPlain(items) {
  return items.map((item) => item.label).join(" › ");
}

/**
 * Caminho de retorno após editor ou ações auxiliares.
 * @param {unknown} from
 * @param {string} [fallback="/Posts"]
 */
export function resolvePostsReturnPath(from, fallback = "/Posts") {
  if (typeof from === "string" && from.startsWith("/")) {
    return from;
  }
  return fallback;
}

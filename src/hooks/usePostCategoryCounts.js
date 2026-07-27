import { useMemo } from "react";

import {
  POST_FEED_SECTION_ORDER,
  resolvePostCategoria,
  WORSHIP_POST_CATEGORY_KEYS,
} from "@/lib/postCategories";
import { usePostsList } from "@/hooks/usePostsList";
import { isPostDemoExample } from "@/lib/posts";

/**
 * Contagem de posts publicados por categoria (Eventos / cultos).
 */
export function usePostCategoryCounts({ showDrafts = false } = {}) {
  const { posts, isLoading: postsLoading } = usePostsList({ showDrafts });

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      POST_FEED_SECTION_ORDER.map((key) => [key, 0]),
    );
    for (const post of posts) {
      if (isPostDemoExample(post)) continue;
      const cat = resolvePostCategoria(post);
      if (cat && map[cat] !== undefined && WORSHIP_POST_CATEGORY_KEYS.has(cat)) {
        map[cat] = (map[cat] || 0) + 1;
      }
    }
    return map;
  }, [posts]);

  const visibleCategories = POST_FEED_SECTION_ORDER;

  return {
    counts,
    visibleCategories,
    isLoading: postsLoading,
  };
}

/** @param {number} n */
export function formatPostCount(n) {
  if (n === 1) return "1 item";
  return `${n} itens`;
}

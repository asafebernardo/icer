import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  POST_FEED_SECTION_ORDER,
  resolvePostCategoria,
  WORSHIP_POST_CATEGORY_KEYS,
} from "@/lib/postCategories";
import { belongsToNoticiasFeed } from "@/lib/noticiasFeed";
import { listEventosMerged } from "@/lib/eventosQuery";
import { usePostsList } from "@/hooks/usePostsList";
import { api } from "@/api/client";
import { getSiteConfig } from "@/lib/siteConfig";

function countAplicativosItems(materiais, links) {
  let n = 0;
  for (const m of Array.isArray(materiais) ? materiais : []) {
    if (String(m?.arquivo_url ?? "").trim()) n += 1;
  }
  for (const l of Array.isArray(links) ? links : []) {
    if (String(l?.url ?? "").trim()) n += 1;
  }
  return n;
}

/**
 * Contagem de posts publicados por categoria.
 */
export function usePostCategoryCounts({ showDrafts = false } = {}) {
  const { posts, isLoading: postsLoading } = usePostsList({ showDrafts });

  const { data: eventos = [], isLoading: eventosLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
    staleTime: 30_000,
  });

  const { data: materiais = [], isLoading: materiaisLoading } = useQuery({
    queryKey: ["materiais"],
    queryFn: async () => {
      try {
        const list = await api.entities.Material.list("-created_date", 50);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      POST_FEED_SECTION_ORDER.map((key) => [key, 0]),
    );
    for (const post of posts) {
      if (belongsToNoticiasFeed(post)) {
        map.noticias = (map.noticias || 0) + 1;
        continue;
      }
      const cat = resolvePostCategoria(post);
      if (cat && map[cat] !== undefined && WORSHIP_POST_CATEGORY_KEYS.has(cat)) {
        map[cat] = (map[cat] || 0) + 1;
      } else {
        map.noticias = (map.noticias || 0) + 1;
      }
    }
    const eventCount = Array.isArray(eventos) ? eventos.length : 0;
    map.eventos = eventCount;
    map.agenda = eventCount;
    const cfg = getSiteConfig();
    const links = Array.isArray(cfg.linksUteis) ? cfg.linksUteis : [];
    map.aplicativos = countAplicativosItems(materiais, links);
    return map;
  }, [posts, eventos, materiais]);

  const visibleCategories = POST_FEED_SECTION_ORDER;

  return {
    counts,
    visibleCategories,
    isLoading: postsLoading || eventosLoading || materiaisLoading,
  };
}

/** @param {number} n */
export function formatPostCount(n) {
  if (n === 1) return "1 item";
  return `${n} itens`;
}

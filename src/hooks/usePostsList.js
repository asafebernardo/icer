import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { normalizePost } from "@/lib/posts";
import { resolvePostCategoria } from "@/lib/postCategories";

const FETCH_LIMIT = 500;

export function usePostsList({ showDrafts = false, categoriaKey = null } = {}) {
  const { data, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", "all", showDrafts],
    queryFn: async () => {
      const qs = new URLSearchParams({
        limit: String(FETCH_LIMIT),
        skip: "0",
        sort: "-data",
      });
      if (showDrafts) qs.set("drafts", "1");
      const r = await fetch(`/api/data/posts?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error("Não foi possível carregar posts.");
      return r.json();
    },
  });

  const posts = useMemo(() => {
    const api = Array.isArray(data?.items) ? data.items : [];
    const source = api;

    const filtered = categoriaKey
      ? source.filter((raw) => {
          const cat = resolvePostCategoria(raw);
          if (categoriaKey === "outros") return !cat;
          return cat === categoriaKey;
        })
      : source;

    return [...filtered].sort((a, b) => {
      const da = normalizePost(a).data_publicacao || "";
      const db = normalizePost(b).data_publicacao || "";
      if (da === db) return 0;
      return da < db ? 1 : -1;
    });
  }, [data, showDrafts, categoriaKey]);

  return { posts, isLoading: postsLoading, total: posts.length };
}

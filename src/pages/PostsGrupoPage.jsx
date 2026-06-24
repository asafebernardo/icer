import { useEffect, useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";

import PostsCategoryMosaic from "@/components/posts/PostsCategoryMosaic";
import PostsNavBreadcrumb from "@/components/posts/PostsNavBreadcrumb";
import PostsHubHeader from "@/components/posts/PostsHubHeader";
import { useAuth } from "@/lib/AuthContext";
import {
  getPostMosaicGroup,
  POST_MOSAIC_TAG_GROUPS,
} from "@/lib/postCategories";
import { formatPostCount, usePostCategoryCounts } from "@/hooks/usePostCategoryCounts";
import { cn } from "@/lib/utils";

const VALID_GROUPS = new Set(POST_MOSAIC_TAG_GROUPS.map((g) => g.id));

export default function PostsGrupoPage() {
  const { grupo } = useParams();
  const { checkUserAuth } = useAuth();
  const groupId = String(grupo || "").trim().toLowerCase();
  const group = getPostMosaicGroup(groupId);
  const { counts, isLoading } = usePostCategoryCounts();

  useEffect(() => {
    checkUserAuth?.();
  }, [checkUserAuth]);

  const totalInGroup = useMemo(() => {
    if (!group) return 0;
    return group.categories.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  }, [group, counts]);

  if (!VALID_GROUPS.has(groupId)) {
    return <Navigate to="/Posts" replace />;
  }

  return (
    <div className="posts-hub min-h-screen">
      <div className="posts-hub__atmosphere" aria-hidden />

      <section
        className={cn(
          "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          "max-w-[1280px]",
        )}
      >
        <PostsHubHeader
          backTo="/Posts"
          breadcrumb={
            <PostsNavBreadcrumb centered groupId={groupId} />
          }
        />

        {!isLoading ? (
          <p className="mt-2 text-center text-xs font-medium tracking-wide text-[#64748B]">
            {formatPostCount(totalInGroup)}
          </p>
        ) : null}

        <div className="mt-6 sm:mt-8">
          <PostsCategoryMosaic groupId={groupId} />
        </div>
      </section>
    </div>
  );
}

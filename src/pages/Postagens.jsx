import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import PostsGroupMosaic from "../components/posts/PostsGroupMosaic";
import PostsHubHeader from "../components/posts/PostsHubHeader";
import PostsNavBreadcrumb from "../components/posts/PostsNavBreadcrumb";

import { useAuth } from "@/lib/AuthContext";
import { formatPostCount, usePostCategoryCounts } from "@/hooks/usePostCategoryCounts";
import { cn } from "@/lib/utils";

export default function Postagens() {
  const location = useLocation();
  const { checkUserAuth } = useAuth();
  const { counts, isLoading } = usePostCategoryCounts();

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  const totalPosts = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0),
    [counts],
  );

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
          breadcrumb={
            <PostsNavBreadcrumb
              centered
              items={[{ label: "Posts", href: null }]}
            />
          }
        />

        {!isLoading ? (
          <p className="mt-2 text-center text-xs font-medium tracking-wide text-[#64748B]">
            {formatPostCount(totalPosts)}
          </p>
        ) : null}

        <div className="mt-6 sm:mt-8">
          <PostsGroupMosaic />
        </div>
      </section>
    </div>
  );
}

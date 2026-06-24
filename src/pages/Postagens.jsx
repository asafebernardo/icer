import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import PostsCategoryMosaic from "../components/posts/PostsCategoryMosaic";
import PostsHubHeader from "../components/posts/PostsHubHeader";
import { FEED_MAX_W } from "../components/posts/PostsPageHero";

import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

export default function Postagens() {
  const location = useLocation();
  const { checkUserAuth } = useAuth();
  const [tagFilter, setTagFilter] = useState("all");

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  return (
    <div className="posts-hub min-h-screen">
      <div className="posts-hub__atmosphere" aria-hidden />

      <section
        className={cn(
          "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          FEED_MAX_W,
        )}
      >
        <PostsHubHeader
          selectedTag={tagFilter}
          onTagChange={setTagFilter}
        />
        <div className="mt-6 sm:mt-8">
          <PostsCategoryMosaic tagFilter={tagFilter} />
        </div>
      </section>
    </div>
  );
}

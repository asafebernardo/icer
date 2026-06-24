import { useEffect, useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import PostsEventosGroupView from "../components/posts/PostsEventosGroupView";
import { PostsCategoryFeedSkeleton } from "../components/posts/PostsCategoryFeed";
import PostsAdminToolbar from "../components/posts/PostsAdminToolbar";
import PageSectionIntro from "@/components/shared/PageSectionIntro";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { usePostsList } from "@/hooks/usePostsList";
import {
  POST_MOSAIC_EVENTOS_CATEGORY_KEYS,
  resolvePostCategoria,
} from "@/lib/postCategories";
import {
  POSTS_HUB_DESCRIPTION,
  POSTS_HUB_LABEL,
  POSTS_HUB_PATH,
  POSTS_HUB_TITLE,
} from "@/lib/postsNavPath";
import { cn } from "@/lib/utils";

const EVENTOS_CATEGORY_SET = new Set(POST_MOSAIC_EVENTOS_CATEGORY_KEYS);

export default function Postagens() {
  const [searchParams] = useSearchParams();
  const { user: authUser, checkUserAuth } = useAuth();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();
  const { posts, isLoading: postsLoading } = usePostsList();

  const sessionUser = authUser ?? getUser();
  const canCreate =
    canMenuAction(sessionUser, MENU.POSTAGENS, "create") && editMode;
  const needsEditMode =
    canMenuAction(sessionUser, MENU.POSTAGENS, "create") &&
    !editMode &&
    !isHomolog;

  useEffect(() => {
    checkUserAuth?.();
  }, [checkUserAuth]);

  const eventosPosts = useMemo(() => {
    return posts.filter((post) => {
      const cat = resolvePostCategoria(post);
      return cat && EVENTOS_CATEGORY_SET.has(cat);
    });
  }, [posts]);

  if (searchParams.has("ano")) {
    return <Navigate to={POSTS_HUB_PATH} replace />;
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
        <PageSectionIntro
          tag={POSTS_HUB_LABEL}
          title={POSTS_HUB_TITLE}
          description={POSTS_HUB_DESCRIPTION}
        />

        <PostsAdminToolbar
          className="mb-6"
          canCreate={canCreate}
          createHref="/Eventos/nova"
          needsEditMode={needsEditMode}
        />

        <div>
          {postsLoading ? (
            <PostsCategoryFeedSkeleton count={8} variant="mosaic" />
          ) : (
            <PostsEventosGroupView posts={eventosPosts} isLoading={postsLoading} />
          )}
        </div>
      </section>
    </div>
  );
}

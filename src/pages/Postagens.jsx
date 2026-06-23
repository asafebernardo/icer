import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import PostsCategoryMosaic from "../components/posts/PostsCategoryMosaic";
import PostsHubHeader from "../components/posts/PostsHubHeader";
import PostsAdminToolbar from "../components/posts/PostsAdminToolbar";
import { FEED_MAX_W } from "../components/posts/PostsPageHero";

import { getUser, canMenuAction, MENU, isAdminUser } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { cn } from "@/lib/utils";

export default function Postagens() {
  const location = useLocation();
  const { user: authUser, checkUserAuth } = useAuth();
  const [showDrafts, setShowDrafts] = useState(false);
  const [tagFilter, setTagFilter] = useState("all");

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  const sessionUser = authUser ?? getUser();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();
  const canCreatePerm = canMenuAction(sessionUser, MENU.POSTAGENS, "create");
  const canCreate = canCreatePerm && editMode;
  const isAdmin = isAdminUser(sessionUser);

  useEffect(() => {
    if (!isAdmin) setShowDrafts(false);
  }, [isAdmin]);

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
          actions={
            <PostsAdminToolbar
              canCreate={canCreate}
              canShowDrafts={isAdmin}
              showDrafts={showDrafts}
              onToggleDrafts={() => setShowDrafts((v) => !v)}
              needsEditMode={canCreatePerm && !editMode && !isHomolog}
            />
          }
        />
        <div className="mt-6 sm:mt-8">
          <PostsCategoryMosaic showDrafts={showDrafts} tagFilter={tagFilter} />
        </div>
      </section>
    </div>
  );
}

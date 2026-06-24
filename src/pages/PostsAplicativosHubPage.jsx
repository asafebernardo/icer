import { useMemo } from "react";

import MateriaisTab from "@/components/materiais/MateriaisTab";
import PostsHubHeader from "@/components/posts/PostsHubHeader";
import PostsNavBreadcrumb from "@/components/posts/PostsNavBreadcrumb";
import { FEED_MAX_W } from "@/components/posts/PostsPageHero";
import { INFORMACOES_HUB_PATH } from "@/lib/postsNavPath";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { canRecursosMenuAction } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { cn } from "@/lib/utils";

export default function PostsAplicativosHubPage() {
  const user = useSyncedAuthUser();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();

  const canCreateReal = canRecursosMenuAction(user, "create");
  const needsEditMode = canCreateReal && !editMode && !isHomolog;

  const perm = useMemo(
    () => ({
      create: canRecursosMenuAction(user, "create") && editMode,
      edit: canRecursosMenuAction(user, "edit") && editMode,
      delete: canRecursosMenuAction(user, "delete") && editMode,
    }),
    [user, editMode],
  );

  const headerActions =
    needsEditMode ? (
      <div className="posts-admin-toolbar flex flex-wrap items-center justify-end gap-2 rounded-[14px] border border-white/[0.06] px-3 py-2.5 sm:px-4">
        <p className="text-xs text-[#64748B]">
          Ative o{" "}
          <span className="font-medium text-[#94A3B8]">modo edição</span> para
          gerir materiais e links.
        </p>
      </div>
    ) : null;

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
          backTo={INFORMACOES_HUB_PATH}
          actions={headerActions}
          breadcrumb={
            <PostsNavBreadcrumb
              centered
              groupId="informacoes"
              categoryKey="aplicativos"
            />
          }
        />

        <div className="mt-6 sm:mt-8">
          <MateriaisTab perm={perm} embedded />
        </div>
      </section>
    </div>
  );
}

import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import Agenda from "@/pages/Agenda";
import PostsHubHeader from "@/components/posts/PostsHubHeader";
import PostsNavBreadcrumb from "@/components/posts/PostsNavBreadcrumb";
import { FEED_MAX_W } from "@/components/posts/PostsPageHero";
import { Button } from "@/components/ui/button";
import { INFORMACOES_HUB_PATH } from "@/lib/postsNavPath";
import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { cn } from "@/lib/utils";

export default function PostsAgendaHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();

  const tabParam = String(searchParams.get("tab") || "").trim().toLowerCase();
  const onEventosTab = tabParam === "eventos" || tabParam === "configuracoes";

  const sessionUser = authUser ?? getUser();
  const canCreateEventoReal = canMenuAction(sessionUser, MENU.EVENTOS, "create");
  const canCreateEvento = canCreateEventoReal && editMode;
  const needsEditMode =
    canCreateEventoReal && !editMode && !isHomolog;

  const handleNovoEvento = () => {
    setSearchParams({ tab: "eventos", novo: "1" }, { replace: true });
  };

  const headerActions =
    onEventosTab && (canCreateEvento || needsEditMode) ? (
      <div className="posts-admin-toolbar flex flex-wrap items-center justify-end gap-2 rounded-[14px] border border-white/[0.06] px-3 py-2.5 sm:px-4">
        {needsEditMode ? (
          <p className="text-xs text-[#64748B]">
            Ative o{" "}
            <span className="font-medium text-[#94A3B8]">modo edição</span> para
            criar eventos.
          </p>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={handleNovoEvento}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo evento
          </Button>
        )}
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
              categoryKey="agenda"
            />
          }
        />

        <div className="mt-6 sm:mt-8">
          <Agenda embedded />
        </div>
      </section>
    </div>
  );
}

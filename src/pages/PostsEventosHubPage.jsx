import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { List, Plus, Settings2 } from "lucide-react";

import Eventos from "@/pages/Eventos";
import EventosRotinas from "@/pages/EventosRotinas";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostsHubHeader from "@/components/posts/PostsHubHeader";
import PostsNavBreadcrumb from "@/components/posts/PostsNavBreadcrumb";
import { FEED_MAX_W } from "@/components/posts/PostsPageHero";
import { formatPostCount } from "@/hooks/usePostCategoryCounts";
import { listEventosMerged } from "@/lib/eventosQuery";
import { getUser, canMenuAction, isAdminUser, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { cn } from "@/lib/utils";

export default function PostsEventosHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();

  const tabParam = String(searchParams.get("tab") || "").trim().toLowerCase();
  if (tabParam === "agenda") {
    return <Navigate to="/Posts/categoria/agenda" replace />;
  }

  const sessionUser = authUser ?? getUser();
  const isAdmin = isAdminUser(sessionUser);

  if (tabParam === "configuracoes" && !isAdmin) {
    return <Navigate to="/Posts/categoria/eventos" replace />;
  }

  const activeTab =
    isAdmin && tabParam === "configuracoes" ? "configuracoes" : "eventos";
  const canCreateEventoReal = canMenuAction(sessionUser, MENU.EVENTOS, "create");
  const canCreateEvento = canCreateEventoReal && editMode;
  const needsEditMode =
    canCreateEventoReal && !editMode && !isHomolog;

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
    staleTime: 30_000,
  });

  const setTab = (value) => {
    setSearchParams(value === "eventos" ? {} : { tab: value }, { replace: true });
  };

  const handleNovoEvento = () => {
    setSearchParams({ tab: "eventos", novo: "1" });
  };

  const headerActions =
    canCreateEvento || needsEditMode ? (
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
          backTo="/Posts/grupo/informacoes"
          actions={headerActions}
          breadcrumb={
            <PostsNavBreadcrumb
              centered
              groupId="informacoes"
              categoryKey="eventos"
            />
          }
        />

        {!isLoading ? (
          <p className="mt-2 text-center text-xs font-medium tracking-wide text-[#64748B]">
            {formatPostCount(eventos.length)}
          </p>
        ) : null}

        <div className="mt-6 sm:mt-8">
          {isAdmin ? (
            <Tabs value={activeTab} onValueChange={setTab} className="w-full">
              <TabsList className="mb-6 grid h-auto min-h-11 w-full grid-cols-2 rounded-xl p-1 sm:inline-flex sm:w-auto">
                <TabsTrigger value="eventos" className="gap-1.5 px-2 sm:gap-2 sm:px-4">
                  <List className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">Eventos</span>
                </TabsTrigger>
                <TabsTrigger value="configuracoes" className="gap-1.5 px-2 sm:gap-2 sm:px-4">
                  <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">Configurações</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="eventos" className="mt-0 outline-none">
                <Eventos embedded />
              </TabsContent>

              <TabsContent value="configuracoes" className="mt-0 outline-none">
                <EventosRotinas embedded />
              </TabsContent>
            </Tabs>
          ) : (
            <Eventos embedded />
          )}
        </div>
      </section>
    </div>
  );
}

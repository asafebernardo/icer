import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, List, Plus, Settings2 } from "lucide-react";

import Agenda from "@/pages/Agenda";
import Eventos from "@/pages/Eventos";
import EventosRotinas from "@/pages/EventosRotinas";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FEED_MAX_W } from "@/components/posts/PostsPageHero";
import { formatPostCount } from "@/hooks/usePostCategoryCounts";
import { listEventosMerged } from "@/lib/eventosQuery";
import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { cn } from "@/lib/utils";

const TAB_VALUES = ["agenda", "eventos", "configuracoes"];

export default function PostsEventosHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();

  const tabParam = String(searchParams.get("tab") || "").trim().toLowerCase();
  const activeTab = TAB_VALUES.includes(tabParam) ? tabParam : "agenda";

  const sessionUser = authUser ?? getUser();
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
    setSearchParams(value === "agenda" ? {} : { tab: value }, { replace: true });
  };

  const handleNovoEvento = () => {
    setSearchParams({ tab: "eventos", novo: "1" });
  };

  return (
    <div className="posts-hub min-h-screen">
      <div className="posts-hub__atmosphere" aria-hidden />

      <section
        className={cn(
          "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          FEED_MAX_W,
        )}
      >
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-2 text-[#94A3B8] hover:text-[#F8FAFC]"
              asChild
            >
              <Link to="/Posts">
                <ArrowLeft className="h-4 w-4" />
                Categorias
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold tracking-tight text-[#F8FAFC] sm:text-xl">
                Eventos
              </h1>
              {!isLoading && (
                <p className="mt-0.5 text-xs font-medium tracking-wide text-[#64748B]">
                  {formatPostCount(eventos.length)}
                </p>
              )}
            </div>
          </div>

          {canCreateEvento || needsEditMode ? (
            <div className="posts-admin-toolbar flex flex-wrap items-center justify-end gap-2 rounded-[14px] border border-white/[0.06] px-3 py-2.5 sm:px-4">
              {needsEditMode ? (
                <p className="text-xs text-[#64748B]">
                  Ative o{" "}
                  <span className="font-medium text-[#94A3B8]">modo edição</span>{" "}
                  para criar eventos.
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
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-6 grid h-auto min-h-11 w-full grid-cols-3 rounded-xl p-1 sm:inline-flex sm:w-auto">
            <TabsTrigger value="agenda" className="gap-1.5 px-2 sm:gap-2 sm:px-4">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="eventos" className="gap-1.5 px-2 sm:gap-2 sm:px-4">
              <List className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="gap-1.5 px-2 sm:gap-2 sm:px-4">
              <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Configurações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="mt-0 outline-none">
            <Agenda embedded />
          </TabsContent>

          <TabsContent value="eventos" className="mt-0 outline-none">
            <Eventos embedded />
          </TabsContent>

          <TabsContent value="configuracoes" className="mt-0 outline-none">
            <EventosRotinas embedded />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

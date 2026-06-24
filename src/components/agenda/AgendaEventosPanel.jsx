import { List, Settings2 } from "lucide-react";

import Eventos from "@/pages/Eventos";
import EventosRotinas from "@/pages/EventosRotinas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUser, isAdminUser } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";

/**
 * Programação de eventos (lista + rotinas admin) — integrado na aba Agenda.
 * @param {{
 *   activeSubTab: "eventos" | "configuracoes";
 *   onSubTabChange: (value: "eventos" | "configuracoes") => void;
 * }} props
 */
export default function AgendaEventosPanel({
  activeSubTab,
  onSubTabChange,
}) {
  const { user: authUser } = useAuth();
  const sessionUser = authUser ?? getUser();
  const isAdmin = isAdminUser(sessionUser);

  if (isAdmin) {
    return (
      <Tabs
        value={activeSubTab}
        onValueChange={(v) =>
          onSubTabChange(v === "configuracoes" ? "configuracoes" : "eventos")
        }
        className="w-full"
      >
        <TabsList className="mb-6 grid h-auto min-h-11 w-full grid-cols-2 rounded-xl p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="eventos" className="gap-1.5 px-2 sm:gap-2 sm:px-4">
            <List className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Eventos</span>
          </TabsTrigger>
          <TabsTrigger
            value="configuracoes"
            className="gap-1.5 px-2 sm:gap-2 sm:px-4"
          >
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
    );
  }

  return <Eventos embedded />;
}

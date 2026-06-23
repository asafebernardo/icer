import { useState, useEffect } from "react";

import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import HistoriaHubHeader from "@/components/historia/HistoriaHubHeader";
import AdminSettingsShell from "@/components/admin/AdminSettingsShell";
import AdminMembrosPanel from "@/components/dashboard/AdminMembrosPanel";
import { FEED_MAX_W } from "@/components/posts/PostsPageHero";
import { getUser } from "@/lib/auth";
import useAdminNavAccess from "@/hooks/useAdminNavAccess";
import { cn } from "@/lib/utils";

const ADMIN_HEADER = {
  tag: "Administração",
  title: "Painel administrativo",
  description: "Gestão do site e contas.",
};

function AdminHubShell({ children }) {
  return (
    <div className="posts-hub min-h-screen">
      <div className="posts-hub__atmosphere" aria-hidden />
      <section
        className={cn(
          "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
          FEED_MAX_W,
        )}
      >
        <HistoriaHubHeader {...ADMIN_HEADER} />
        <div className="mt-6 sm:mt-8">{children}</div>
      </section>
    </div>
  );
}

function GateAdmin() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="mb-3 font-display text-2xl font-bold text-foreground">
          Acesso restrito
        </h2>
        <p className="text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const { canUseAdminTabs: serverControlsEnabled } = useAdminNavAccess(user);

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener("icer-user-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("icer-user-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (user === undefined) {
    return (
      <AdminHubShell>
        <div className="space-y-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
        </div>
      </AdminHubShell>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <AdminHubShell>
        <GateAdmin />
      </AdminHubShell>
    );
  }

  return (
    <AdminHubShell>
      <AdminSettingsShell
        tabMembrosSlot={
          <AdminMembrosPanel
            adminUser={user}
            serverControlsEnabled={serverControlsEnabled}
          />
        }
      />
    </AdminHubShell>
  );
}

import { useState, useEffect } from "react";

import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "../components/shared/PageHeader";
import AdminSettingsShell from "@/components/admin/AdminSettingsShell";
import AdminMembrosPanel from "@/components/dashboard/AdminMembrosPanel";
import { isAdminUser, getUser } from "@/lib/auth";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import UserAvatar from "@/components/shared/UserAvatar";

function GateAdmin() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">
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
      <div>
        <PageHeader tag="Admin" title="Painel administrativo" pageKey="admin" />
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-20">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div>
        <PageHeader tag="Admin" title="Painel administrativo" pageKey="admin" />
        <GateAdmin />
      </div>
    );
  }

  const serverControlsEnabled =
    isAdminUser(user) && isServerAuthEnabled() && user?._authSource === "server";

  return (
    <div>
      <PageHeader
        tag="Administração"
        title="Painel administrativo"
        description="Perfil, utilizadores, grupos de permissão, site, Google, servidor, segurança e restantes opções."
        pageKey="admin"
      />

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <UserAvatar user={user} className="h-10 w-10" />
          <div>
            <span className="text-muted-foreground">Sessão:</span>{" "}
            <span className="font-medium text-foreground">{user.full_name || user.email}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-foreground">{user.email}</span>
          </div>
        </div>

        <AdminSettingsShell
          tabMembrosSlot={
            <AdminMembrosPanel adminUser={user} serverControlsEnabled={serverControlsEnabled} />
          }
        />
      </div>
    </div>
  );
}

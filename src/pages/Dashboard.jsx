import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  RefreshCw,
  Lock,
  ChevronDown,
  Clock,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "../components/shared/PageHeader";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import ServerUsersPanel from "@/components/dashboard/ServerUsersPanel";
import GlobalAuditLogPanel from "@/components/dashboard/GlobalAuditLogPanel";
import AdminSitePanel from "@/components/dashboard/AdminSitePanel";
import { api } from "@/api/client";
import * as auth from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import {
  SITE_MENUS,
  getMemberPermissions,
  setMemberPermissions,
  getUserMetaMap,
  permKeyForUser,
  getMenuPermBlock,
} from "@/lib/memberRegistry";

function LockedTabNotice() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-foreground font-medium mb-1">
        <Lock className="w-4 h-4" />
        Acesso restrito
      </div>
      Esta aba está visível, mas só administradores podem usar.
    </div>
  );
}

function formatLastLogin(iso) {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

async function fetchUsersMerged() {
  const meta = getUserMetaMap();
  const attach = (u) => {
    const base = { ...u };
    const key = permKeyForUser(base);
    return {
      ...base,
      _permKey: key,
      full_name:
        base.full_name ||
        base.name ||
        base.display_name ||
        (base.email ? base.email.split("@")[0] : "—"),
      last_login_at:
        base.last_login_at ||
        base.lastLogin ||
        base.last_login ||
        meta[key]?.lastLogin ||
        (base.email ? meta[base.email]?.lastLogin : null) ||
        null,
    };
  };

  try {
    const apiUsers = await api.entities.User.list();
    if (Array.isArray(apiUsers)) return apiUsers.map(attach);
  } catch {
    /* ignore */
  }

  const cur = auth.getUser();
  if (cur?.email) {
    return [
      attach({
        id: `session-${cur.email}`,
        email: cur.email,
        full_name: cur.full_name || cur.email,
        role: cur.role,
      }),
    ];
  }
  return [];
}

async function syncMenuPermissionsToServer(nextMap) {
  try {
    await fetch("/api/data/menu-permissions", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextMap),
    });
  } catch {
    /* ignore */
  }
}

function TabMembros({ user, users, loadingUsers, refetch }) {
  const [openUserKey, setOpenUserKey] = useState(null);
  const [allPermissions, setAllPermissions] = useState(getMemberPermissions);

  useEffect(() => {
    if (
      !auth.isServerAuthEnabled() ||
      user?._authSource !== "server" ||
      !auth.isAdminUser(user)
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/data/menu-permissions", {
          credentials: "include",
        });
        if (!r.ok || cancelled) return;
        const data = await r.json();
        if (
          data &&
          typeof data === "object" &&
          Object.keys(data).length > 0
        ) {
          setMemberPermissions(data);
          setAllPermissions(data);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const userRows = useMemo(() => {
    return users.map((u) => ({
      ...u,
      permKey: permKeyForUser(u),
    }));
  }, [users]);

  const handlePermChange = (userKey, menuKey, action, checked) => {
    setAllPermissions((prev) => {
      const block = getMenuPermBlock(prev, userKey, menuKey);
      const next = {
        ...prev,
        [userKey]: {
          ...(prev[userKey] || {}),
          [menuKey]: { ...block, [action]: checked },
        },
      };
      setMemberPermissions(next);
      if (
        auth.isServerAuthEnabled() &&
        user?._authSource === "server" &&
        auth.isAdminUser(user)
      ) {
        void syncMenuPermissionsToServer(next);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Membros
              </h2>
              <p className="text-sm text-muted-foreground">
                {loadingUsers ? "Carregando…" : `${userRows.length} cadastro(s)`}
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {loadingUsers ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : userRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhum membro encontrado.
          </p>
        ) : (
          <div className="space-y-3">
            {userRows.map((u) => {
              const key = u.permKey;
              const open = openUserKey === key;
              return (
                <Collapsible
                  key={key}
                  open={open}
                  onOpenChange={(v) => setOpenUserKey(v ? key : null)}
                  className="border border-border rounded-xl overflow-hidden bg-muted/20"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground truncate">
                          {u.full_name || "—"}
                        </span>
                        {auth.isAdminUser(u) && (
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {u.email}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Último login: {formatLastLogin(u.last_login_at)}
                      </p>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0">
                        Permissões no site
                        <ChevronDown
                          className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t border-border/80 bg-background/50">
                      <p className="text-xs text-muted-foreground py-3">
                        Por omissão, todos os menus têm criar, editar e apagar
                        ativos para cada membro. Desative só o que quiser
                        restringir (valores guardados neste navegador).
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm min-w-[520px]">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="text-left font-medium p-3">
                                Menu
                              </th>
                              <th className="text-center font-medium p-3 w-24">
                                Criar
                              </th>
                              <th className="text-center font-medium p-3 w-24">
                                Editar
                              </th>
                              <th className="text-center font-medium p-3 w-24">
                                Deletar
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {SITE_MENUS.map((menu) => {
                              const block = getMenuPermBlock(
                                allPermissions,
                                key,
                                menu.key,
                              );
                              return (
                                <tr
                                  key={menu.key}
                                  className="border-b border-border/60 last:border-0"
                                >
                                  <td className="p-3 font-medium text-foreground">
                                    {menu.label}
                                  </td>
                                  {(["create", "edit", "delete"]).map(
                                    (action) => (
                                      <td
                                        key={action}
                                        className="p-3 text-center"
                                      >
                                        <div className="flex justify-center">
                                          <Switch
                                            checked={block[action]}
                                            onCheckedChange={(checked) =>
                                              handlePermChange(
                                                key,
                                                menu.key,
                                                action,
                                                checked,
                                              )
                                            }
                                            disabled={
                                              !!user?.email &&
                                              u.email === user.email
                                            }
                                            aria-label={`${menu.label} ${action}`}
                                          />
                                        </div>
                                      </td>
                                    ),
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {user?.email && u.email === user.email && (
                        <p className="text-xs text-muted-foreground mt-2">
                          As permissões do seu próprio utilizador não são
                          alteradas aqui por segurança.
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const isAdmin = auth.isAdminUser(user);
  const canUseAdminTabs =
    isAdmin && auth.isServerAuthEnabled() && user?._authSource === "server";

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["dashboard-users"],
    queryFn: fetchUsersMerged,
    enabled: isAdmin && activeTab === "members",
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        <Lock className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        pageKey="dashboard"
        tag={isAdmin ? "Admin" : "Conta"}
        title={isAdmin ? "Dashboard" : "Minha área"}
        description={
          isAdmin
            ? "Perfil, membros e permissões nos menus do site"
            : "Edite o seu nome, e-mail e palavra-passe"
        }
      />

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-6 p-4 rounded-xl border border-border bg-card text-sm">
          <span className="text-muted-foreground">Sessão:</span>{" "}
          <span className="font-medium text-foreground">
            {user.full_name || user.email}
          </span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-foreground">{user.email}</span>
        </div>

        {isAdmin && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              type="button"
              variant={activeTab === "profile" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("profile")}
            >
              A minha conta
            </Button>
            <Button
              type="button"
              variant={activeTab === "members" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("members")}
            >
              Membros
            </Button>
            <Button
              type="button"
              variant={activeTab === "server-users" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("server-users")}
              disabled={!canUseAdminTabs}
              title={!canUseAdminTabs ? "Apenas admin (servidor)" : undefined}
            >
              Contas servidor
            </Button>
            <Button
              type="button"
              variant={activeTab === "site" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("site")}
              disabled={!canUseAdminTabs}
              title={!canUseAdminTabs ? "Apenas admin (servidor)" : undefined}
            >
              Site
            </Button>
            <Button
              type="button"
              variant={activeTab === "audit-log" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("audit-log")}
              disabled={!canUseAdminTabs}
              title={!canUseAdminTabs ? "Apenas admin (servidor)" : undefined}
            >
              Logs
            </Button>
          </div>
        )}

        {(!isAdmin || activeTab === "profile") && (
          <ProfileSettings user={user} />
        )}

        {isAdmin && activeTab === "members" && (
          <TabMembros
            user={user}
            users={users}
            loadingUsers={isLoading}
            refetch={refetch}
          />
        )}

        {activeTab === "server-users" &&
          (canUseAdminTabs ? <ServerUsersPanel /> : <LockedTabNotice />)}

        {activeTab === "site" &&
          (canUseAdminTabs ? <AdminSitePanel /> : <LockedTabNotice />)}

        {activeTab === "audit-log" &&
          (canUseAdminTabs ? <GlobalAuditLogPanel /> : <LockedTabNotice />)}
      </div>
    </div>
  );
}

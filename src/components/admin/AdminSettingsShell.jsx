import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Lock } from "lucide-react";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import AdminPermissionGroupsPanel from "@/components/dashboard/AdminPermissionGroupsPanel";
import GlobalAuditLogPanel from "@/components/dashboard/GlobalAuditLogPanel";
import AdminGooglePanel from "@/components/dashboard/AdminGooglePanel";
import AdminSitePanel from "@/components/dashboard/AdminSitePanel";
import AdminSiteReleasesPanel from "@/components/dashboard/AdminSiteReleasesPanel";
import LoginBlocksPanel from "@/components/dashboard/LoginBlocksPanel";
import AdminCadastrosOpcoesPanel from "@/components/dashboard/AdminCadastrosOpcoesPanel";
import AdminServerPanel from "@/components/dashboard/AdminServerPanel";
import AdminUploadsPanel from "@/components/dashboard/AdminUploadsPanel";
import * as auth from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import {
  DEFAULT_EXTRA_ADMIN_NAV_ITEMS,
  getAdminTabIds,
} from "@/lib/adminNavConfig";

function LockedTabNotice() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-foreground font-medium mb-1">
        <Lock className="w-4 h-4" />
        Acesso restrito
      </div>
      Esta aba está visível, mas só está disponível com sessão no servidor
      (MongoDB).
    </div>
  );
}

/**
 * Painel admin: perfil, utilizadores, grupos de permissão, site e restantes opções.
 * @param {{ tabMembrosSlot?: import("react").ReactNode }} props
 */
export default function AdminSettingsShell({ tabMembrosSlot }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabIds = useMemo(
    () => getAdminTabIds(DEFAULT_EXTRA_ADMIN_NAV_ITEMS),
    [],
  );
  const tabFromUrl = (searchParams.get("tab") || "").trim() || null;
  const [activeTab, setActiveTab] = useState(() => {
    if (tabFromUrl && validTabIds.has(tabFromUrl)) return tabFromUrl;
    return "profile";
  });

  const isAdmin = auth.isAdminUser(user);
  const canUseAdminTabs =
    isAdmin && auth.isServerAuthEnabled() && user?._authSource === "server";

  useEffect(() => {
    if (tabFromUrl === "members") {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", "admin-users");
          return next;
        },
        { replace: true },
      );
      return;
    }
    if (!tabFromUrl) {
      setActiveTab((c) => (c === "profile" ? c : "profile"));
      return;
    }
    if (!validTabIds.has(tabFromUrl)) {
      setActiveTab("profile");
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("tab");
          return next;
        },
        { replace: true },
      );
      return;
    }
    setActiveTab((c) => (c === tabFromUrl ? c : tabFromUrl));
  }, [tabFromUrl, validTabIds, setSearchParams]);

  const handleTabChange = useCallback(
    (nextId) => {
      setActiveTab(nextId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextId === "profile") next.delete("tab");
          else next.set("tab", nextId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Lock className="h-8 w-8" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <div className="min-w-0">
          <TabsContent value="profile">
            <ProfileSettings user={user} />
          </TabsContent>
          <TabsContent value="admin-users">
            <div className="space-y-10">{tabMembrosSlot}</div>
          </TabsContent>
          <TabsContent value="permission-groups">
            {canUseAdminTabs ? <AdminPermissionGroupsPanel /> : <LockedTabNotice />}
          </TabsContent>
          <TabsContent value="site-updates">
            <AdminSiteReleasesPanel />
          </TabsContent>
          <TabsContent value="site">
            {canUseAdminTabs ? <AdminSitePanel /> : <LockedTabNotice />}
          </TabsContent>
          <TabsContent value="google">
            {canUseAdminTabs ? <AdminGooglePanel /> : <LockedTabNotice />}
          </TabsContent>
          <TabsContent value="server">
            {canUseAdminTabs ? <AdminServerPanel /> : <LockedTabNotice />}
          </TabsContent>
          <TabsContent value="uploads">
            {canUseAdminTabs ? <AdminUploadsPanel /> : <LockedTabNotice />}
          </TabsContent>
          <TabsContent value="cadastros-opcoes">
            {canUseAdminTabs ? <AdminCadastrosOpcoesPanel /> : <LockedTabNotice />}
          </TabsContent>
          <TabsContent value="audit-log">
            {canUseAdminTabs ? <GlobalAuditLogPanel /> : <LockedTabNotice />}
          </TabsContent>
          <TabsContent value="login-blocks">
            {canUseAdminTabs ? <LoginBlocksPanel /> : <LockedTabNotice />}
          </TabsContent>
      </div>
    </Tabs>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Lock } from "lucide-react";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import AdminPermissionGroupsPanel from "@/components/dashboard/AdminPermissionGroupsPanel";
import PendingDeletionsPanel from "@/components/dashboard/PendingDeletionsPanel";
import GlobalAuditLogPanel from "@/components/dashboard/GlobalAuditLogPanel";
import AdminGooglePanel from "@/components/dashboard/AdminGooglePanel";
import AdminSitePanel from "@/components/dashboard/AdminSitePanel";
import LoginBlocksPanel from "@/components/dashboard/LoginBlocksPanel";
import AdminCadastrosOpcoesPanel from "@/components/dashboard/AdminCadastrosOpcoesPanel";
import AdminServerPanel from "@/components/dashboard/AdminServerPanel";
import AdminUploadsPanel from "@/components/dashboard/AdminUploadsPanel";
import HomologBlockedMenusNotice from "@/components/admin/HomologBlockedMenusNotice";
import { useAuth } from "@/lib/AuthContext";
import useAdminNavAccess from "@/hooks/useAdminNavAccess";
import {
  DEFAULT_EXTRA_ADMIN_NAV_ITEMS,
  getAdminTabIds,
  getLoginBlockedAdminNavItems,
} from "@/lib/adminNavConfig";

function LockedTabNotice({ homolog = false, blockedItems = [] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-foreground font-medium mb-1">
        <Lock className="w-4 h-4" />
        Acesso restrito
      </div>
      {homolog ? (
        <>
          <p>
            Esta aba exige sessão no servidor (MongoDB). Em homologação pode
            navegar até aqui, mas as ações só funcionam após login.
          </p>
          {blockedItems.length ? (
            <p className="mt-3 text-xs">
              Outras abas bloqueadas:{" "}
              {blockedItems.map((item) => item.label).join(" · ")}
            </p>
          ) : null}
        </>
      ) : (
        <p>
          Esta aba está visível, mas só está disponível com sessão no servidor
          (MongoDB).
        </p>
      )}
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

  const {
    canUseAdminTabs,
    showHomologLoginBlockedHints,
    isHomolog,
  } = useAdminNavAccess(user);
  const loginBlockedItems = useMemo(
    () => getLoginBlockedAdminNavItems(DEFAULT_EXTRA_ADMIN_NAV_ITEMS),
    [],
  );
  const lockedNotice = (
    <LockedTabNotice homolog={isHomolog} blockedItems={loginBlockedItems} />
  );

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
      <div className="min-w-0 space-y-6">
          {showHomologLoginBlockedHints ? (
            <HomologBlockedMenusNotice blockedItems={loginBlockedItems} />
          ) : null}
          <TabsContent value="profile">
            <ProfileSettings user={user} />
          </TabsContent>
          <TabsContent value="admin-users">
            <div className="space-y-10">{tabMembrosSlot}</div>
          </TabsContent>
          <TabsContent value="permission-groups">
            {canUseAdminTabs ? <AdminPermissionGroupsPanel /> : lockedNotice}
          </TabsContent>
          <TabsContent value="site">
            {canUseAdminTabs ? <AdminSitePanel /> : lockedNotice}
          </TabsContent>
          <TabsContent value="google">
            {canUseAdminTabs ? <AdminGooglePanel /> : lockedNotice}
          </TabsContent>
          <TabsContent value="server">
            {canUseAdminTabs ? <AdminServerPanel /> : lockedNotice}
          </TabsContent>
          <TabsContent value="uploads">
            {canUseAdminTabs ? <AdminUploadsPanel /> : lockedNotice}
          </TabsContent>
          <TabsContent value="cadastros-opcoes">
            {canUseAdminTabs ? <AdminCadastrosOpcoesPanel /> : lockedNotice}
          </TabsContent>
          <TabsContent value="pending-deletions">
            {canUseAdminTabs ? <PendingDeletionsPanel /> : lockedNotice}
          </TabsContent>
          <TabsContent value="audit-log">
            {canUseAdminTabs ? <GlobalAuditLogPanel /> : lockedNotice}
          </TabsContent>
          <TabsContent value="login-blocks">
            {canUseAdminTabs ? <LoginBlocksPanel /> : lockedNotice}
          </TabsContent>
      </div>
    </Tabs>
  );
}

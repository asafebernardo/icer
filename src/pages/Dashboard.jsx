import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Lock,
  Settings,
  Globe,
  FileText,
  ShieldAlert,
  HardDrive,
  Cloud,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import ServerUsersPanel from "@/components/dashboard/ServerUsersPanel";
import GlobalAuditLogPanel from "@/components/dashboard/GlobalAuditLogPanel";
import AdminSitePanel from "@/components/dashboard/AdminSitePanel";
import LoginBlocksPanel from "@/components/dashboard/LoginBlocksPanel";
import BackupBetaPanel from "@/components/dashboard/BackupBetaPanel";
import GoogleIntegrationPanel from "@/components/dashboard/GoogleIntegrationPanel";
import TwoFactorPanel from "@/components/dashboard/TwoFactorPanel";
import DashboardAdminNav from "@/components/dashboard/DashboardAdminNav";
import * as auth from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import UserAvatar from "@/components/shared/UserAvatar";

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

function MembrosSemServidorNotice() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-foreground font-medium mb-1">
        <Users className="w-4 h-4" />
        Contas no servidor
      </div>
      Ative <code className="text-xs bg-muted px-1 rounded">VITE_USE_SERVER_AUTH=true</code> e
      inicie sessão com uma conta MongoDB para criar e gerir utilizadores aqui.
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const isAdmin = auth.isAdminUser(user);
  const canUseAdminTabs =
    isAdmin && auth.isServerAuthEnabled() && user?._authSource === "server";

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
        title={isAdmin ? "Configurações" : "Minha área"}
        description={
          isAdmin
            ? "Perfil, contas no servidor, backup, integrações e restantes opções de administração"
            : "Edite o seu nome, e-mail e palavra-passe"
        }
      />

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-6 p-4 rounded-xl border border-border bg-card text-sm flex flex-wrap items-center gap-3">
          <UserAvatar user={user} className="h-10 w-10" />
          <div>
            <span className="text-muted-foreground">Sessão:</span>{" "}
            <span className="font-medium text-foreground">
              {user.full_name || user.email}
            </span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-foreground">{user.email}</span>
          </div>
        </div>

        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col lg:flex-row gap-6">
              <DashboardAdminNav
                active={activeTab}
                onChange={setActiveTab}
                canUseAdminTabs={canUseAdminTabs}
                icons={{
                  profile: Settings,
                  members: Users,
                  site: Globe,
                  "login-blocks": ShieldAlert,
                  "audit-log": FileText,
                  backup: HardDrive,
                  google: Cloud,
                  "2fa": ShieldCheck,
                }}
              />

              <div className="flex-1 min-w-0">
                <TabsContent value="profile">
                  <ProfileSettings user={user} />
                </TabsContent>
                <TabsContent value="members">
                  {canUseAdminTabs ? (
                    <ServerUsersPanel />
                  ) : (
                    <MembrosSemServidorNotice />
                  )}
                </TabsContent>
                <TabsContent value="site">
                  {canUseAdminTabs ? <AdminSitePanel /> : <LockedTabNotice />}
                </TabsContent>
                <TabsContent value="audit-log">
                  {canUseAdminTabs ? <GlobalAuditLogPanel /> : <LockedTabNotice />}
                </TabsContent>
                <TabsContent value="login-blocks">
                  {canUseAdminTabs ? <LoginBlocksPanel /> : <LockedTabNotice />}
                </TabsContent>
                <TabsContent value="backup">
                  {canUseAdminTabs ? <BackupBetaPanel /> : <LockedTabNotice />}
                </TabsContent>
                <TabsContent value="google">
                  {canUseAdminTabs ? <GoogleIntegrationPanel /> : <LockedTabNotice />}
                </TabsContent>
                <TabsContent value="2fa">
                  {canUseAdminTabs ? <TwoFactorPanel /> : <LockedTabNotice />}
                </TabsContent>
              </div>
            </div>
          </Tabs>
        ) : (
          <ProfileSettings user={user} />
        )}
      </div>
    </div>
  );
}

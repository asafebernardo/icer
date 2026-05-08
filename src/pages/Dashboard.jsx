import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import * as auth from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import UserAvatar from "@/components/shared/UserAvatar";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Lock className="h-8 w-8" />
      </div>
    );
  }

  if (auth.isAdminUser(user)) {
    return <Navigate to="/Admin" replace />;
  }

  return (
    <div>
      <PageHeader
        pageKey="dashboard"
        tag="Conta"
        title="Minha área"
        description="Edite o seu nome, e-mail e palavra-passe"
      />

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm">
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

        <ProfileSettings user={user} />
      </div>
    </div>
  );
}

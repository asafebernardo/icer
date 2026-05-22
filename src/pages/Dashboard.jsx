import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import * as auth from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
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
        description="Perfil e palavra-passe."
      />

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ProfileSettings user={user} />
      </div>
    </div>
  );
}

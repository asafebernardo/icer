import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/auth";

/**
 * Restringe conteúdo a administradores (validação só no cliente — a API deve validar sempre).
 */
export default function AdminRoute({ children }) {
  const { user, isLoadingAuth, authChecked } = useAuth();

  if (!authChecked || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/Home" replace />;
  }

  return children;
}

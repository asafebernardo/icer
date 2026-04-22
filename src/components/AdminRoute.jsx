import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/auth";

/**
 * Restringe conteúdo a administradores (validação só no cliente — a API deve validar sempre).
 */
export default function AdminRoute({ children }) {
  const { user, isLoadingAuth, authChecked, openLoginModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authChecked || isLoadingAuth) return;
    if (!user) {
      openLoginModal();
      navigate("/Home", { replace: true });
    }
  }, [authChecked, isLoadingAuth, user, openLoginModal, navigate]);

  if (!authChecked || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/Home" replace />;
  }

  return children;
}

import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/auth";
import RouteSkeleton from "@/components/shared/RouteSkeleton";

/**
 * Restringe conteúdo a administradores (validação só no cliente — a API deve validar sempre).
 */
export default function AdminRoute({ children }) {
  const { user, isLoadingAuth, authChecked, isValidatingSession, navigateToLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authChecked || isLoadingAuth || isValidatingSession) return;
    if (!user) {
      navigate("/Home", { replace: true });
      navigateToLogin();
    }
  }, [authChecked, isLoadingAuth, isValidatingSession, user, navigateToLogin, navigate]);

  // Manter a UI montada se já houver sessão — revalidação em foco (ex. upload)
  // não deve desmontar formulários/wizards e apagar estado em memória.
  if (!authChecked || isLoadingAuth) {
    return <RouteSkeleton />;
  }

  if (isValidatingSession && !user) {
    return <RouteSkeleton />;
  }

  if (!user) {
    return <RouteSkeleton />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/Home" replace />;
  }

  return children;
}

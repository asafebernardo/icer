import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/auth";
import RouteSkeleton from "@/components/shared/RouteSkeleton";

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

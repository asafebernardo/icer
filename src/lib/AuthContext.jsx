import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  getUser,
  login as authLogin,
  logout as authLogout,
  updateUserProfile as authUpdateUserProfile,
  isServerAuthEnabled,
  setServerMenuEffective,
} from "@/lib/auth";
import {
  persistSessionUser,
  clearSessionUser,
} from "@/lib/sessionIntegrity";
import LoginModal from "@/components/auth/LoginModal";
import { queryClientInstance } from "@/lib/query-client";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
  shouldUseRemotePublicWorkspace,
} from "@/lib/publicWorkspace";
import { hydrateMemberRegistryFromPublicWorkspace } from "@/lib/memberRegistry";

const AuthContext = createContext(null);

function readUserFromStorage() {
  return getUser();
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(readUserFromStorage);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  const checkUserAuth = useCallback(() => {
    setUser(getUser());
    setAuthChecked(true);
    setIsLoadingAuth(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
  }, []);

  useEffect(() => {
    if (!shouldUseRemotePublicWorkspace()) return;
    void queryClientInstance
      .fetchQuery({
        queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
        queryFn: fetchPublicWorkspaceJson,
      })
      .then((w) => hydrateMemberRegistryFromPublicWorkspace(w))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isServerAuthEnabled()) {
        try {
          const r = await fetch("/api/auth/me", { credentials: "include" });
          if (r.ok) {
            const u = await r.json();
            persistSessionUser({
              id: u.id,
              email: u.email,
              full_name: u.full_name,
              role: u.role,
              funcao: u.funcao ?? "",
              avatar_url: u.avatar_url ? String(u.avatar_url) : "",
              _authSource: "server",
            });
            setServerMenuEffective(null);
          } else {
            const cur = getUser();
            if (cur?._authSource === "server") {
              clearSessionUser();
              setServerMenuEffective(null);
            }
          }
        } catch {
          /* rede / servidor offline */
        }
      }
      if (!cancelled) checkUserAuth();
    })();
    return () => {
      cancelled = true;
    };
  }, [checkUserAuth]);

  const login = useCallback(async (email, senha) => {
    const result = await authLogin(email, senha);
    if (!result.ok) return result;
    setUser(getUser());
    if (isServerAuthEnabled()) {
      void queryClientInstance
        .fetchQuery({
          queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
          queryFn: fetchPublicWorkspaceJson,
        })
        .then((w) => hydrateMemberRegistryFromPublicWorkspace(w))
        .catch(() => {});
      setServerMenuEffective(null);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
    return { ok: true };
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const next = await authUpdateUserProfile(fields);
    setUser(getUser());
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
    return next;
  }, []);

  const logout = () => {
    authLogout();
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
  };

  const navigateToLogin = useCallback(() => {
    setLoginModalOpen(true);
    const path = location.pathname;
    if (path !== "/Home" && path !== "/") {
      navigate("/Home", { replace: true });
    }
  }, [navigate, location.pathname]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
        authChecked,
        authError: null,
        isLoadingPublicSettings: false,
        navigateToLogin,
        openLoginModal,
        closeLoginModal,
        loginModalOpen,
        checkUserAuth,
        login,
        updateProfile,
        logout,
      }}
    >
      {children}
      <LoginModal />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  getUser,
  login as authLogin,
  logout as authLogout,
  updateUserProfile as authUpdateUserProfile,
  isServerAuthEnabled,
  isDemoAdminSession,
  setServerMenuEffective,
} from "@/lib/auth";
import {
  persistSessionUser,
  clearSessionUser,
} from "@/lib/sessionIntegrity";
import LoginModal from "@/components/auth/LoginModal";
import { toast } from "sonner";
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
  const [googleLoginIntent, setGoogleLoginIntent] = useState(null);

  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);
  const clearGoogleLoginIntent = useCallback(() => setGoogleLoginIntent(null), []);

  const checkUserAuth = useCallback(() => {
    setUser(getUser());
    setAuthChecked(true);
    setIsLoadingAuth(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
  }, []);

  const validateServerSessionRef = useRef(null);
  const validateServerSession = useCallback(async () => {
    if (!isServerAuthEnabled()) {
      checkUserAuth();
      return;
    }
    if (validateServerSessionRef.current) {
      await validateServerSessionRef.current;
      return;
    }
    const run = (async () => {
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
            totp_enabled: u.totp_enabled === true,
            totp_grace_started_at: u.totp_grace_started_at || null,
            _authSource: "server",
          });
          setServerMenuEffective(null);
          const { ensureCsrfCookieClient } = await import("@/lib/csrf");
          await ensureCsrfCookieClient();
        } else if (r.status === 401) {
          const cur = getUser();
          // Qualquer espelho local que não seja sessão demo: se o servidor não reconhece sessão, limpar.
          // Inclui registos antigos sem `_authSource` (antes do campo existir).
          if (cur && !isDemoAdminSession(cur)) {
            clearSessionUser();
            setServerMenuEffective(null);
          }
        }
      } catch {
        /* rede / servidor offline — não limpar sessão local */
      } finally {
        checkUserAuth();
      }
    })();
    validateServerSessionRef.current = run;
    try {
      await run;
    } finally {
      validateServerSessionRef.current = null;
    }
  }, [checkUserAuth]);

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
    void (async () => {
      if (!cancelled) await validateServerSession();
    })();
    return () => {
      cancelled = true;
    };
  }, [validateServerSession]);

  useEffect(() => {
    if (!isServerAuthEnabled()) return undefined;
    let debounceTimer = 0;
    const schedule = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void validateServerSession();
      }, 250);
    };
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(debounceTimer);
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [validateServerSession]);

  useEffect(() => {
    if (!isServerAuthEnabled()) return;
    void validateServerSession();
  }, [location.pathname, validateServerSession]);

  useEffect(() => {
    if (!isServerAuthEnabled()) return;
    const sp = new URLSearchParams(location.search);
    const gl = sp.get("google_login");
    if (!gl) return;

    const stripGoogleParams = () => {
      sp.delete("google_login");
      sp.delete("reason");
      sp.delete("login_token");
      const q = sp.toString();
      navigate(
        { pathname: location.pathname, search: q ? `?${q}` : "" },
        { replace: true },
      );
    };

    if (gl === "ok") {
      stripGoogleParams();
      void (async () => {
        await validateServerSession();
        toast.success("Sessão iniciada com Google.");
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
        setLoginModalOpen(false);
      })();
      return;
    }

    if (gl === "err") {
      const reason = sp.get("reason") || "oauth";
      const messages = {
        oauth: "Não foi possível concluir o login com Google.",
        forbidden: "Este e-mail não está autorizado a usar o login Google.",
        no_account: "Não existe conta com este e-mail no servidor.",
        blocked: "Início de sessão temporariamente indisponível.",
        session_active:
          "Já existe uma sessão activa. Tente de novo com Google e assinale «Encerrar outra sessão activa», ou use e-mail e palavra-passe.",
      };
      setGoogleLoginIntent({
        type: "err",
        message: messages[reason] || messages.oauth,
      });
      stripGoogleParams();
      setLoginModalOpen(true);
      return;
    }

    if (gl === "2fa") {
      const token = sp.get("login_token");
      if (token && token.length >= 10) {
        setGoogleLoginIntent({ type: "2fa", login_token: token });
        stripGoogleParams();
        setLoginModalOpen(true);
      }
    }
  }, [location.pathname, location.search, navigate, validateServerSession]);

  const login = useCallback(async (email, senha, opts) => {
    const result = await authLogin(email, senha, opts);
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
        googleLoginIntent,
        clearGoogleLoginIntent,
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

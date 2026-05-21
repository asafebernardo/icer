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
import { toast } from "sonner";
import { queryClientInstance } from "@/lib/query-client";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
  shouldUseRemotePublicWorkspace,
} from "@/lib/publicWorkspace";
import { hydrateMemberRegistryFromPublicWorkspace } from "@/lib/memberRegistry";
import {
  buildGoogleLoginStartUrl,
  forgetGoogleLoginHintOnServer,
  getGoogleLoginHint,
  setGoogleLoginHint,
  syncGoogleLoginHintFromServer,
} from "@/lib/googleLoginHint";

const AuthContext = createContext(null);

const GOOGLE_LOGIN_ERROR_MESSAGES = {
  oauth: "Não foi possível concluir o login com Google.",
  forbidden: "Este e-mail não está autorizado a usar o login Google.",
  no_account: "Não existe conta com este e-mail no servidor.",
  blocked: "Início de sessão temporariamente indisponível.",
  google_reauth:
    "A sessão Google expirou. Clique novamente em «Continuar com Google».",
};

function readUserFromStorage() {
  return getUser();
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(readUserFromStorage);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [googleLoginBusy, setGoogleLoginBusy] = useState(false);
  const [googleLoginAvailable, setGoogleLoginAvailable] = useState(false);
  const [rememberedGoogleEmail, setRememberedGoogleEmail] = useState("");
  const googleReauthPendingRef = useRef(false);

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
            _authSource: "server",
          });
          setServerMenuEffective(null);
          const { ensureCsrfCookieClient } = await import("@/lib/csrf");
          await ensureCsrfCookieClient();
        } else if (r.status === 401) {
          const cur = getUser();
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
    if (!isServerAuthEnabled()) {
      setGoogleLoginAvailable(false);
      setRememberedGoogleEmail("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/auth/google-login/config", { credentials: "include" });
        const j = await r.json().catch(() => ({}));
        if (!cancelled && r.ok && j.enabled === true) {
          setGoogleLoginAvailable(true);
          const remembered = String(j.remembered_email || "").trim();
          if (remembered) {
            syncGoogleLoginHintFromServer(remembered);
            setRememberedGoogleEmail(remembered);
          } else {
            setRememberedGoogleEmail(getGoogleLoginHint());
          }
        } else if (!cancelled) {
          setGoogleLoginAvailable(false);
          setRememberedGoogleEmail("");
        }
      } catch {
        if (!cancelled) {
          setGoogleLoginAvailable(false);
          setRememberedGoogleEmail(getGoogleLoginHint());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isServerAuthEnabled()) return;
    const sp = new URLSearchParams(location.search);
    const gl = sp.get("google_login");
    if (!gl) return;

    const stripGoogleParams = () => {
      sp.delete("google_login");
      sp.delete("reason");
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
        const u = getUser();
        if (u?.email) setGoogleLoginHint(u.email);
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
      })();
      return;
    }

    if (gl === "err") {
      const reason = sp.get("reason") || "oauth";
      toast.error(
        GOOGLE_LOGIN_ERROR_MESSAGES[reason] || GOOGLE_LOGIN_ERROR_MESSAGES.oauth,
      );
      if (reason === "google_reauth") {
        googleReauthPendingRef.current = true;
      }
      stripGoogleParams();
      return;
    }

    stripGoogleParams();
  }, [location.pathname, location.search, navigate, validateServerSession]);

  const startGoogleLogin = useCallback(
    async (opts = {}) => {
      if (!isServerAuthEnabled()) {
        toast.error(
          "Autenticação do servidor desativada. Ative VITE_USE_SERVER_AUTH para usar login Google.",
        );
        return;
      }
      if (!googleLoginAvailable) {
        toast.error("Login com Google não está configurado.");
        return;
      }
      setGoogleLoginBusy(true);
      try {
        const noSilent =
          opts.noSilent === true || googleReauthPendingRef.current;
        googleReauthPendingRef.current = false;
        const r = await fetch(
          buildGoogleLoginStartUrl({ ...opts, noSilent }),
          { credentials: "include" },
        );
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.message || r.statusText);
        if (j.remembered_email) {
          syncGoogleLoginHintFromServer(j.remembered_email);
          setRememberedGoogleEmail(j.remembered_email);
        }
        if (j.auth_url) window.location.assign(j.auth_url);
      } catch (err) {
        toast.error(err?.message || "Não foi possível iniciar o login com Google.");
      } finally {
        setGoogleLoginBusy(false);
      }
    },
    [googleLoginAvailable],
  );

  const useAnotherGoogleAccount = useCallback(async () => {
    await forgetGoogleLoginHintOnServer();
    setRememberedGoogleEmail("");
    await startGoogleLogin({ pickAccount: true });
  }, [startGoogleLogin]);

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
    const path = location.pathname;
    if (path !== "/Home" && path !== "/") {
      navigate("/Home", { replace: true });
    }
    void startGoogleLogin();
  }, [navigate, location.pathname, startGoogleLogin]);

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
        startGoogleLogin,
        useAnotherGoogleAccount,
        googleLoginBusy,
        googleLoginAvailable,
        rememberedGoogleEmail,
        checkUserAuth,
        login,
        updateProfile,
        logout,
      }}
    >
      {children}
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

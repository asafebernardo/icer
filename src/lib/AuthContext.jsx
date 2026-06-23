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
import { LAST_VISITED_PATH_KEY } from "@/lib/lastPath";
import { setLoginIntent } from "@/lib/loginIntent";
import { fetchRuntimeEnv, getRuntimeEnvSync } from "@/lib/runtimeEnv";
import { tryHomologDevLogin } from "@/lib/homologDevLogin";

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
  /** Ignora respostas 401 de validações iniciadas antes de um login/logout recente. */
  const sessionValidationGenRef = useRef(0);
  const lastSessionOkAtRef = useRef(0);
  /** Evita limpar sessão local enquanto login/callback OAuth ainda está em curso. */
  const loginInProgressRef = useRef(false);
  const [isValidatingSession, setIsValidatingSession] = useState(false);

  const invalidateStaleServerSession = useCallback((opts = {}) => {
    const { notify = true } = opts;
    const cur = getUser();
    if (!cur || isDemoAdminSession(cur)) return false;
    if (notify) {
      toast.info("A sua sessão expirou. Inicie sessão novamente.");
    }
    clearSessionUser();
    setServerMenuEffective(null);
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
    return true;
  }, []);

  const checkUserAuth = useCallback(() => {
    setUser(getUser());
    setAuthChecked(true);
    setIsLoadingAuth(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
  }, []);

  const validateServerSessionRef = useRef(null);
  const homologBootstrapAttemptedRef = useRef(false);

  const applySessionUser = useCallback(async (u) => {
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
    setUser(getUser());
    const { ensureCsrfCookieClient } = await import("@/lib/csrf");
    await ensureCsrfCookieClient();
  }, []);

  const fetchSessionUser = useCallback(async () => {
    const r = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });
    if (!r.ok) return null;
    return r.json();
  }, []);

  const fetchSessionUserWithRetry = useCallback(async () => {
    const delays = [0, 120, 400];
    for (let i = 0; i < delays.length; i += 1) {
      if (delays[i] > 0) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, delays[i]);
        });
      }
      const u = await fetchSessionUser();
      if (u) return u;
    }
    return null;
  }, [fetchSessionUser]);

  const validateServerSession = useCallback(async () => {
    if (!isServerAuthEnabled()) {
      checkUserAuth();
      return;
    }
    if (validateServerSessionRef.current) {
      await validateServerSessionRef.current;
      return;
    }
    const genAtStart = sessionValidationGenRef.current;
    setIsValidatingSession(true);
    const run = (async () => {
      try {
        await fetchRuntimeEnv();
        let u = await fetchSessionUserWithRetry();
        if (sessionValidationGenRef.current !== genAtStart) return;

        if (!u && getRuntimeEnvSync().isHomolog && !homologBootstrapAttemptedRef.current) {
          homologBootstrapAttemptedRef.current = true;
          const booted = await tryHomologDevLogin();
          if (booted && sessionValidationGenRef.current === genAtStart) {
            u = await fetchSessionUserWithRetry();
          }
        }

        if (u) {
          lastSessionOkAtRef.current = Date.now();
          await applySessionUser(u);
        } else if (sessionValidationGenRef.current === genAtStart) {
          const cur = getUser();
          const isHomolog = getRuntimeEnvSync().isHomolog;
          if (
            cur &&
            !isDemoAdminSession(cur) &&
            !isHomolog &&
            !loginInProgressRef.current
          ) {
            invalidateStaleServerSession();
          }
        }
      } catch {
        /* rede / servidor offline — não limpar sessão local */
      } finally {
        setIsValidatingSession(false);
        if (sessionValidationGenRef.current === genAtStart) {
          checkUserAuth();
        }
      }
    })();
    validateServerSessionRef.current = run;
    try {
      await run;
    } finally {
      validateServerSessionRef.current = null;
    }
  }, [checkUserAuth, applySessionUser, fetchSessionUserWithRetry, invalidateStaleServerSession]);

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
        loginInProgressRef.current = true;
        sessionValidationGenRef.current += 1;
        try {
          await validateServerSession();
          const u = getUser();
          if (u?.email) setGoogleLoginHint(u.email);
          if (getUser()) {
            toast.success("Sessão iniciada com Google.");
          }
          if (isServerAuthEnabled() && getUser()) {
            void queryClientInstance
              .fetchQuery({
                queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
                queryFn: fetchPublicWorkspaceJson,
              })
              .then((w) => hydrateMemberRegistryFromPublicWorkspace(w))
              .catch(() => {});
            setServerMenuEffective(null);
          }
        } finally {
          loginInProgressRef.current = false;
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
        if (j.auth_url) {
          sessionValidationGenRef.current += 1;
          window.location.assign(j.auth_url);
        }
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

  const reconcileLocalSession = useCallback(async () => {
    if (!isServerAuthEnabled()) {
      checkUserAuth();
      return { ok: !!getUser() };
    }
    const u = await fetchSessionUser();
    if (u) {
      lastSessionOkAtRef.current = Date.now();
      await applySessionUser(u);
      return { ok: true };
    }
    if (getUser()) {
      invalidateStaleServerSession({ notify: false });
    }
    return { ok: false };
  }, [applySessionUser, fetchSessionUser, checkUserAuth, invalidateStaleServerSession]);

  const login = useCallback(async (email, senha) => {
    sessionValidationGenRef.current += 1;
    homologBootstrapAttemptedRef.current = false;
    loginInProgressRef.current = true;
    try {
      const result = await authLogin(email, senha);
      if (!result.ok) return result;
      const u = await fetchSessionUser();
      if (!u) {
        clearSessionUser();
        setServerMenuEffective(null);
        setUser(null);
        return {
          ok: false,
          message:
            "A sessão não ficou activa neste browser. Permita cookies e use sempre o mesmo endereço (localhost ou 127.0.0.1).",
        };
      }
      lastSessionOkAtRef.current = Date.now();
      await applySessionUser(u);
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
    } finally {
      loginInProgressRef.current = false;
    }
  }, [applySessionUser, fetchSessionUser]);

  const updateProfile = useCallback(async (fields) => {
    const next = await authUpdateUserProfile(fields);
    setUser(getUser());
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
    return next;
  }, []);

  const logout = () => {
    sessionValidationGenRef.current += 1;
    homologBootstrapAttemptedRef.current = false;
    authLogout();
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
  };

  const navigateToLogin = useCallback(() => {
    const p = location.pathname + location.search;
    if (
      p !== "/login" &&
      p !== "/Login" &&
      location.pathname !== "/Home" &&
      location.pathname !== "/"
    ) {
      sessionStorage.setItem(LAST_VISITED_PATH_KEY, p);
    }
    if (location.pathname === "/login" || location.pathname === "/Login") {
      return;
    }
    setLoginIntent();
    navigate("/login", { replace: true });
  }, [navigate, location.pathname, location.search]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
        authChecked,
        authError: null,
        isLoadingPublicSettings: false,
        isValidatingSession,
        navigateToLogin,
        startGoogleLogin,
        useAnotherGoogleAccount,
        googleLoginBusy,
        googleLoginAvailable,
        rememberedGoogleEmail,
        checkUserAuth,
        reconcileLocalSession,
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

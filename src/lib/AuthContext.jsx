import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

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

const AuthContext = createContext(null);

function readUserFromStorage() {
  return getUser();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUserFromStorage);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(() => {
    setUser(getUser());
    setAuthChecked(true);
    setIsLoadingAuth(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
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
              _authSource: "server",
            });
            try {
              const mr = await fetch("/api/auth/menu-effective", {
                credentials: "include",
              });
              if (mr.ok) {
                setServerMenuEffective(await mr.json());
              }
            } catch {
              /* ignore */
            }
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
    const ok = await authLogin(email, senha);
    if (!ok) return false;
    setUser(getUser());
    if (isServerAuthEnabled()) {
      try {
        const mr = await fetch("/api/auth/menu-effective", {
          credentials: "include",
        });
        if (mr.ok) {
          setServerMenuEffective(await mr.json());
        }
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("icer-user-session"));
    }
    return true;
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

  const navigateToLogin = () => {
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  };

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
  return useContext(AuthContext);
}

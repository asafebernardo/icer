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
} from "@/lib/auth";

const AuthContext = createContext();

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
    checkUserAuth();
  }, [checkUserAuth]);

  const login = useCallback(async (email, senha) => {
    const ok = await authLogin(email, senha);
    if (!ok) return false;
    setUser(getUser());
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

import { createContext, useContext, useEffect, useState, useCallback } from "react";

import { getUser, isAdminUser } from "@/lib/auth";
import { getRuntimeEnvSync } from "@/lib/runtimeEnv";

const STORAGE_KEY = "icer-edit-mode";

const EditModeContext = createContext({
  enabled: false,
  toggle: () => {},
  setEnabled: () => {},
});

function isHomologAdminLoggedIn() {
  if (!getRuntimeEnvSync().isHomolog) return false;
  return isAdminUser(getUser());
}

export function EditModeProvider({ children }) {
  const [enabled, setEnabledState] = useState(false);

  const persist = useCallback((value) => {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const syncFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "1") {
        setEnabledState(true);
        return;
      }
      if (isHomologAdminLoggedIn()) {
        setEnabledState(true);
        persist(true);
      }
    } catch {
      /* ignore */
    }
  }, [persist]);

  useEffect(() => {
    syncFromStorage();
    const onSession = () => syncFromStorage();
    window.addEventListener("icer-user-session", onSession);
    return () => window.removeEventListener("icer-user-session", onSession);
  }, [syncFromStorage]);

  const setEnabled = useCallback(
    (value) => {
      setEnabledState(Boolean(value));
      persist(Boolean(value));
    },
    [persist],
  );

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <EditModeContext.Provider value={{ enabled, toggle, setEnabled }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "icer-edit-mode";

const EditModeContext = createContext({
  enabled: false,
  toggle: () => {},
  setEnabled: () => {},
});

export function EditModeProvider({ children }) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "1") setEnabledState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (value) => {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const setEnabled = useCallback((value) => {
    setEnabledState(Boolean(value));
    persist(Boolean(value));
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, []);

  return (
    <EditModeContext.Provider value={{ enabled, toggle, setEnabled }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}

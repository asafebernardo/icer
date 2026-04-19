import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";

/** Re-lê o utilizador quando muda sessão ou permissões (outros separadores ou Dashboard). */
export function useSyncedAuthUser() {
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("icer-member-permissions", sync);
    window.addEventListener("icer-user-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("icer-member-permissions", sync);
      window.removeEventListener("icer-user-session", sync);
    };
  }, []);

  return user;
}

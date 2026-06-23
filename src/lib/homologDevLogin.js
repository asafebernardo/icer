import { getRuntimeEnvSync } from "@/lib/runtimeEnv";
import { isServerAuthEnabled } from "@/lib/serverAuth";

/** Tenta login automático de homologação (conta seed admin no servidor). */
export async function tryHomologDevLogin() {
  if (!isServerAuthEnabled()) return false;
  if (!getRuntimeEnvSync().isHomolog) return false;
  try {
    const r = await fetch("/api/auth/homolog-dev-login", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    return r.ok;
  } catch {
    return false;
  }
}

import { getRuntimeEnvSync } from "@/lib/runtimeEnv";
import { isServerAuthEnabled } from "@/lib/serverAuth";

/** Login de homologação (conta seed admin) — só com `ICER_HOMOLOG` / `ICER_ENV=homolog`. */
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

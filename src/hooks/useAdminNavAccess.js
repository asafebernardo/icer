import { useMemo } from "react";
import { isAdminUser } from "@/lib/auth";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import { resolveAdminNavAccess } from "@/lib/adminNavConfig";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";

/** Acesso às abas do painel admin (conteúdo vs navegação em homologação). */
export default function useAdminNavAccess(user) {
  const { isHomolog } = useRuntimeEnv();
  return useMemo(
    () =>
      resolveAdminNavAccess({
        isAdmin: isAdminUser(user),
        serverAuthEnabled: isServerAuthEnabled(),
        authSource: user?._authSource ?? null,
        isHomolog,
        isLoggedIn: Boolean(user),
      }),
    [user, isHomolog],
  );
}

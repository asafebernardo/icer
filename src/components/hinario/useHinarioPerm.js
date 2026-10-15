import { useMemo } from "react";

import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { useAuth } from "@/lib/AuthContext";
import { useEditMode } from "@/lib/EditModeContext";
import { canRecursosMenuAction } from "@/lib/auth";

/** Criar, editar e apagar letras: permissão de Recursos e modo edição. */
export function useHinarioPerm() {
  const { user } = useAuth();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();

  return useMemo(
    () => ({
      create: canRecursosMenuAction(user, "create") && editMode,
      edit: canRecursosMenuAction(user, "edit") && editMode,
      delete: canRecursosMenuAction(user, "delete") && editMode,
      needsEditMode:
        !isHomolog &&
        !editMode &&
        (canRecursosMenuAction(user, "create") ||
          canRecursosMenuAction(user, "edit") ||
          canRecursosMenuAction(user, "delete")),
    }),
    [user, editMode, isHomolog],
  );
}

import { Pencil } from "lucide-react";

import { isAdminUser, getUser } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import {
  MOBILE_FAB_BUTTON_CLASS,
  MOBILE_FAB_RIGHT,
  getMobileEditFabSlot,
  mobileFabBottomClass,
} from "@/lib/mobileFabLayout";
import { cn } from "@/lib/utils";

export default function EditModeFloatingFab() {
  const { enabled: editMode, toggle: toggleEditMode } = useEditMode();
  const sessionUser = useSyncedAuthUser() ?? getUser();
  const stackSlot = getMobileEditFabSlot(isAdminUser(sessionUser));

  if (stackSlot == null) return null;

  return (
    <button
      type="button"
      onClick={() => toggleEditMode()}
      aria-label={editMode ? "Desactivar modo de edição" : "Activar modo de edição"}
      aria-pressed={editMode}
      title="Modo de edição"
      className={cn(
        "fixed z-40",
        MOBILE_FAB_BUTTON_CLASS,
        MOBILE_FAB_RIGHT,
        mobileFabBottomClass(stackSlot),
        editMode
          ? "border-accent/40 bg-accent/55 text-accent-foreground"
          : "border-white/10 bg-background/35 text-foreground/80",
      )}
    >
      <Pencil className="h-5 w-5" aria-hidden />
    </button>
  );
}

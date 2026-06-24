import { useMemo } from "react";

import HomeSectionBackdrop from "@/components/home/HomeSectionBackdrop";
import MateriaisTab from "@/components/materiais/MateriaisTab";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canRecursosMenuAction } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";
import { homeSectionSolidContent } from "@/lib/homeSectionSolidClasses";
import { cn } from "@/lib/utils";

/** Secção «Recursos» na Home (materiais + links úteis). */
export default function HomeRecursosSection() {
  const user = useSyncedAuthUser();
  const { enabled: editMode } = useEditMode();
  const perm = useMemo(
    () => ({
      create: canRecursosMenuAction(user, "create") && editMode,
      edit: canRecursosMenuAction(user, "edit") && editMode,
      delete: canRecursosMenuAction(user, "delete") && editMode,
    }),
    [user, editMode],
  );

  return (
    <HomeSectionBackdrop
      className="scroll-mt-[4.75rem] border-t border-border/60 py-16 sm:py-20 lg:py-28 bg-card/25"
      fallbackClassName=""
    >
      <div id="recursos" className="container-page min-w-0">
        <div
          className={cn(
            "mb-12 flex flex-col items-center text-center sm:mb-16",
            homeSectionSolidContent,
          )}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Aplicativos
          </h2>
        </div>

        <MateriaisTab perm={perm} embedded />
      </div>
    </HomeSectionBackdrop>
  );
}

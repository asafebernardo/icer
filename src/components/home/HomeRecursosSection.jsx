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
          <span className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
            Edificação
          </span>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Recursos
          </h2>
          <div className="mt-4 h-1 w-16 rounded-full bg-accent/60" />
          <p className="mt-5 max-w-xl text-muted-foreground">
            Materiais e links úteis para o seu crescimento espiritual.
          </p>
        </div>

        <MateriaisTab perm={perm} embedded />
      </div>
    </HomeSectionBackdrop>
  );
}

import { useMemo } from "react";

import PageHeader from "../components/shared/PageHeader";
import MateriaisTab from "@/components/materiais/MateriaisTab";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canRecursosMenuAction } from "@/lib/auth";
import { useEditMode } from "@/lib/EditModeContext";

export default function Materiais() {
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
    <div>
      <PageHeader
        pageKey="recursos"
        tag="Recursos"
        title="Materiais"
        description="Materiais para download."
      />

      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MateriaisTab perm={perm} />
        </div>
      </section>
    </div>
  );
}

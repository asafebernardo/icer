import { useMemo } from "react";

import PageHeader from "../components/shared/PageHeader";
import MateriaisTab from "@/components/materiais/MateriaisTab";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canRecursosMenuAction } from "@/lib/auth";

export default function Recursos() {
  const user = useSyncedAuthUser();

  const perm = useMemo(
    () => ({
      create: canRecursosMenuAction(user, "create"),
      edit: canRecursosMenuAction(user, "edit"),
      delete: canRecursosMenuAction(user, "delete"),
    }),
    [user],
  );

  return (
    <div>
      <PageHeader
        pageKey="recursos"
        tag="Edificação"
        title="Recursos"
        description="Materiais e links úteis."
      />
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MateriaisTab perm={perm} />
        </div>
      </section>
    </div>
  );
}

import { useMemo } from "react";

import PageHeader from "../components/shared/PageHeader";
import MateriaisTab from "@/components/materiais/MateriaisTab";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";

export default function Materiais() {
  const user = useSyncedAuthUser();
  const perm = useMemo(
    () => ({
      create: canMenuAction(user, MENU.MATERIAIS_TAB, "create"),
      edit: canMenuAction(user, MENU.MATERIAIS_TAB, "edit"),
      delete: canMenuAction(user, MENU.MATERIAIS_TAB, "delete"),
    }),
    [user],
  );

  return (
    <div>
      <PageHeader
        pageKey="materiais"
        tag="Recursos"
        title="Materiais"
        description="Acesse e baixe materiais, documentos e recursos da nossa igreja."
      />

      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MateriaisTab perm={perm} />
        </div>
      </section>
    </div>
  );
}

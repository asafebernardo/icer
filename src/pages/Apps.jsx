import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import MateriaisTab from "@/components/materiais/MateriaisTab";
import PageSectionIntro from "@/components/shared/PageSectionIntro";
import { useAuth } from "@/lib/AuthContext";
import { useEditMode } from "@/lib/EditModeContext";
import useRuntimeEnv from "@/hooks/useRuntimeEnv";
import { canRecursosMenuAction } from "@/lib/auth";
import {
  INFORMACOES_HUB_DESCRIPTION,
  INFORMACOES_HUB_LABEL,
  INFORMACOES_HUB_TITLE,
} from "@/lib/postsNavPath";
import { cn } from "@/lib/utils";

export default function Apps() {
  const location = useLocation();
  const { checkUserAuth, user } = useAuth();
  const { enabled: editMode } = useEditMode();
  const { isHomolog } = useRuntimeEnv();

  const canCreateReal = canRecursosMenuAction(user, "create");
  const needsEditMode = canCreateReal && !editMode && !isHomolog;

  const perm = useMemo(
    () => ({
      create: canRecursosMenuAction(user, "create") && editMode,
      edit: canRecursosMenuAction(user, "edit") && editMode,
      delete: canRecursosMenuAction(user, "delete") && editMode,
    }),
    [user, editMode],
  );

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  return (
    <div className="min-h-screen bg-background">
      <div className="posts-hub min-h-0">
        <div className="posts-hub__atmosphere" aria-hidden />

        <section
          className={cn(
            "posts-hub__shell container-page relative mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
            "max-w-[1280px]",
          )}
        >
          <PageSectionIntro
            tag={INFORMACOES_HUB_LABEL}
            title={INFORMACOES_HUB_TITLE}
            description={INFORMACOES_HUB_DESCRIPTION}
          />

          {needsEditMode ? (
            <p className="mb-4 text-xs text-[#64748B]">
              Ative o{" "}
              <span className="font-medium text-[#94A3B8]">modo edição</span>{" "}
              para gerir materiais e links.
            </p>
          ) : null}

          <MateriaisTab perm={perm} embedded />
        </section>
      </div>
    </div>
  );
}

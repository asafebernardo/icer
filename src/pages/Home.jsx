import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import HeroSection from "../components/home/HeroSection";
import EventoDestaquePopup from "../components/home/EventoDestaquePopup";
import WelcomeSection from "@/components/home/WelcomeSection";
import ContatoSection from "@/components/contato/ContatoSection";
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

export default function Home() {
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

  useEffect(() => {
    const hash = String(location.hash || "").replace(/^#/, "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth" });
  }, [location.hash, location.pathname]);

  return (
    <div className="relative">
      <HeroSection />
      <div
        className="pointer-events-none mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        aria-hidden
      />
      <EventoDestaquePopup />

      <div id="informacoes">
        <WelcomeSection />

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

        <ContatoSection />
      </div>
    </div>
  );
}

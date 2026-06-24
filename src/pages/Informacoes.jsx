import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import PostsCategoryMosaic from "../components/posts/PostsCategoryMosaic";
import PageSectionIntro from "@/components/shared/PageSectionIntro";
import { useAuth } from "@/lib/AuthContext";
import {
  INFORMACOES_HUB_DESCRIPTION,
  INFORMACOES_HUB_LABEL,
  INFORMACOES_HUB_TITLE,
} from "@/lib/postsNavPath";
import { cn } from "@/lib/utils";

export default function Informacoes() {
  const location = useLocation();
  const { checkUserAuth } = useAuth();

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  return (
    <div className="posts-hub min-h-screen">
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

        <div>
          <PostsCategoryMosaic groupId="informacoes" />
        </div>
      </section>
    </div>
  );
}

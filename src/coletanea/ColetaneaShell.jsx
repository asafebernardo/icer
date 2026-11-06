import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";

import { coletaneaOpenedFromSite } from "@/coletanea/entry";
import { attachThemeRoot } from "@/coletanea/lib/theme";
import "@/coletanea/coletanea.css";

export default function ColetaneaShell() {
  const opened = coletaneaOpenedFromSite();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!opened) return undefined;
    const previousTitle = document.title;
    document.title = "Coletânea de Louvor";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, [opened]);

  useEffect(() => {
    if (!opened) return undefined;
    return attachThemeRoot(rootRef.current);
  }, [opened]);

  if (!opened) {
    return (
      <div className="coletanea-app fixed inset-0 z-[70] flex items-center justify-center px-6 text-center">
        <p className="max-w-xs text-sm text-cl-ink-soft">
          Este aplicativo abre pelo menu do site.
        </p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="coletanea-app fixed inset-0 z-[70] overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-cl-phone flex-col overflow-hidden bg-cl-card sm:my-6 sm:h-[calc(100dvh-3rem)] sm:rounded-[2rem] sm:border sm:border-cl-line sm:shadow-sm">
        <Outlet />
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import WhatsAppFab from "./WhatsAppFab";
import SiteSocialLinks from "@/components/layout/SiteSocialLinks";
import HomeViewsMetricsDock from "@/components/layout/HomeViewsMetricsDock";
import DestaqueEventoGlobal from "@/components/layout/DestaqueEventoGlobal";
import PostImagePresentationHost from "@/components/posts/PostImagePresentationHost";
import CommandPalette, {
  useCommandPaletteShortcut,
} from "@/components/CommandPalette";

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const togglePalette = useCallback(
    () => setPaletteOpen((v) => !v),
    [],
  );
  useCommandPaletteShortcut(togglePalette);

  useEffect(() => {
    const open = () => setPaletteOpen(true);
    window.addEventListener("icer-open-cmdk", open);
    return () => window.removeEventListener("icer-open-cmdk", open);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background min-w-0 overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-background focus:px-3 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-ring focus:text-foreground"
      >
        Saltar para o conteúdo
      </a>
      <div className="hidden sm:block">
        <Navbar />
      </div>
      <PostImagePresentationHost />
      <main
        id="main-content"
        className="flex-1 min-w-0 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-[72px] sm:pt-[4.5rem] sm:pb-0 relative w-full"
      >
        {/* Fundo institucional sutil (não altera conteúdo) */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,hsl(var(--primary)/0.06),transparent_55%),radial-gradient(ellipse_90%_50%_at_100%_50%,hsl(var(--accent)/0.04),transparent_50%)]"
          aria-hidden
        />
        <DestaqueEventoGlobal />
        <div className="relative z-0 min-w-0 w-full bg-gradient-to-b from-muted/25 via-background to-muted/15">
          <Outlet />
        </div>
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppFab />
      <div
        className="pointer-events-auto hidden sm:flex fixed right-6 z-40 flex-col items-end gap-2 bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))]"
        aria-label="Atalhos flutuantes"
      >
        <HomeViewsMetricsDock />
        <SiteSocialLinks variant="dock" />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

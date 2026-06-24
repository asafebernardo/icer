import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import WhatsAppFab from "./WhatsAppFab";
import EditModeFloatingFab from "./EditModeFloatingFab";
import SessionFloatingFab from "./SessionFloatingFab";
import DestaqueEventoGlobal from "@/components/layout/DestaqueEventoGlobal";
import PostImagePresentationHost from "@/components/posts/PostImagePresentationHost";
import SiteRecaptchaGate from "@/components/security/SiteRecaptchaGate";

export default function Layout() {
  return (
    <div className="relative min-h-screen flex flex-col min-w-0 overflow-x-hidden">
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
        <SiteRecaptchaGate>
          <DestaqueEventoGlobal />
          <div className="relative z-0 min-w-0 w-full">
            <Outlet />
          </div>
        </SiteRecaptchaGate>
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppFab />
      <SessionFloatingFab />
      <EditModeFloatingFab />
    </div>
  );
}

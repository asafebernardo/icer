import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import HeroSection from "../components/home/HeroSection";
import EventoDestaquePopup from "../components/home/EventoDestaquePopup";
import WelcomeSection from "@/components/home/WelcomeSection";
import { useAuth } from "@/lib/AuthContext";
import { FALE_CONOSCO_PATH, INFORMACOES_HUB_PATH } from "@/lib/postsNavPath";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  useEffect(() => {
    const hash = String(location.hash || "").replace(/^#/, "");
    if (hash === "informacoes") {
      navigate(INFORMACOES_HUB_PATH, { replace: true });
      return;
    }
    if (hash === "contato") {
      navigate(FALE_CONOSCO_PATH, { replace: true });
      return;
    }
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth" });
  }, [location.hash, location.pathname, navigate]);

  return (
    <div className="relative">
      <HeroSection />
      <div
        className="pointer-events-none mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        aria-hidden
      />
      <EventoDestaquePopup />
      <WelcomeSection />
    </div>
  );
}

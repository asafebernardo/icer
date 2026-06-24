import HeroSection from "../components/home/HeroSection";
import EventoDestaquePopup from "../components/home/EventoDestaquePopup";
import WelcomeSection from "../components/home/WelcomeSection";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <EventoDestaquePopup />
      <WelcomeSection />
    </div>
  );
}

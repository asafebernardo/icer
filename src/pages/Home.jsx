import HeroSection from "../components/home/HeroSection";
import EventoDestaquePopup from "../components/home/EventoDestaquePopup";
import WelcomeSection from "../components/home/WelcomeSection";
import ServiceTimes from "../components/home/ServiceTimes";
import HomeRecursosSection from "../components/home/HomeRecursosSection";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <EventoDestaquePopup />
      <WelcomeSection />
      <ServiceTimes />
      <HomeRecursosSection />
    </div>
  );
}

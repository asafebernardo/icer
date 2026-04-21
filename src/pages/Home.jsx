import HeroSection from "../components/home/HeroSection";
import EventoDestaquePopup from "../components/home/EventoDestaquePopup";
import WelcomeSection from "../components/home/WelcomeSection";
import ChurchChannelSection from "../components/home/ChurchChannelSection";
import ServiceTimes from "../components/home/ServiceTimes";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <EventoDestaquePopup />
      <WelcomeSection />
      <ChurchChannelSection />
      <ServiceTimes />
    </div>
  );
}

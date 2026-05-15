import HeroSection from "../components/home/HeroSection";
import EventoDestaquePopup from "../components/home/EventoDestaquePopup";
import WelcomeSection from "../components/home/WelcomeSection";
import HomeSocialCardsSection from "../components/home/HomeSocialCardsSection";
import ServiceTimes from "../components/home/ServiceTimes";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <EventoDestaquePopup />
      <WelcomeSection />
      <HomeSocialCardsSection />
      <ServiceTimes />
    </div>
  );
}

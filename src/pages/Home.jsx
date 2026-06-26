import HeroSection from "../components/home/HeroSection";
import EventoDestaquePopup from "../components/home/EventoDestaquePopup";

export default function Home() {
  return (
    <div className="relative">
      <HeroSection />
      <div
        className="pointer-events-none mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        aria-hidden
      />
      <EventoDestaquePopup />
    </div>
  );
}

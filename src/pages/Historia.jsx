import HistorySection from "@/components/historia/history/HistorySection";
import HistoriaHubHeader from "@/components/historia/HistoriaHubHeader";
import { cn } from "@/lib/utils";

export default function Historia() {
  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <section className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl">
        <HistoriaHubHeader
          tag="Movimento dos Irmãos"
          title="História"
          description="Uma exposição digital — navegue pela linha do tempo e explore cada marco com calma, imagens e narrativa completa."
        />

        <div className={cn("mt-8 sm:mt-10")}>
          <HistorySection />
        </div>
      </section>
    </div>
  );
}

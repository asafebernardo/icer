import HistorySection from "@/components/historia/history/HistorySection";

export default function Historia() {
  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <section className="relative mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-12 lg:max-w-7xl">
        <h1 className="mb-5 text-center font-display text-xl font-semibold tracking-tight text-[#F1F5F9] sm:mb-8 sm:text-[1.75rem]">
          Movimento dos Irmãos
        </h1>
        <HistorySection />
      </section>
    </div>
  );
}

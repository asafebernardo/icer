/** Imagem de fundo institucional (montanhas / névoa). */
export const SITE_BACKGROUND_URL = "/site-background-mountains.webp";

const BG_IMAGE_FILTER = "brightness(0.45) blur(14px) saturate(0.75)";

/**
 * Fundo atmosférico — montanhas distantes, névoa suave, overlay legível.
 */
export default function SiteBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden bg-[#050d18]"
      aria-hidden
    >
      <img
        src={SITE_BACKGROUND_URL}
        alt=""
        className="absolute inset-0 h-full w-full scale-[1.1] object-cover opacity-[0.18]"
        style={{ filter: BG_IMAGE_FILTER }}
        decoding="async"
        fetchPriority="low"
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(2, 8, 20, 0.60)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050d18]/50 via-[#08111F]/20 to-[#050d18]/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050d18]/70 via-transparent to-[#050d18]/30" />
      <div
        className="absolute left-1/4 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#3B82F6]/[0.05] blur-[140px]"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#38BDF8]/[0.04] blur-[110px]"
        aria-hidden
      />
    </div>
  );
}

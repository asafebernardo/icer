/** Imagem de fundo institucional (montanhas / névoa) — só no tema escuro. */
export const SITE_BACKGROUND_URL = "/site-background-mountains.webp";

const BG_IMAGE_FILTER_DARK = "brightness(0.38) blur(16px) saturate(0.7)";

/**
 * Fundo atmosférico — claro: branco airy com glow suave; escuro: cinematográfico.
 */
export default function SiteBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden"
      aria-hidden
    >
      {/* —— Tema claro: clean, sem neblina —— */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(59,130,246,0.10), transparent 35%), radial-gradient(circle at bottom right, rgba(147,197,253,0.08), transparent 30%), linear-gradient(180deg, #ffffff 0%, #f8fafc 45%, #f1f5f9 100%)",
        }}
      />
      <div
        className="float-glow-soft absolute left-[15%] top-[8%] h-72 w-72 rounded-full opacity-40 dark:hidden"
        style={{ background: "rgba(59, 130, 246, 0.06)" }}
      />
      <div
        className="absolute bottom-[12%] right-[10%] h-56 w-56 rounded-full opacity-30 blur-[80px] dark:hidden"
        style={{ background: "rgba(147, 197, 253, 0.12)" }}
      />

      {/* —— Tema escuro —— */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "linear-gradient(180deg, #020617 0%, #030712 45%, #081120 100%)",
        }}
      />
      <div
        className="ambient-aurora absolute -left-[20%] top-[-10%] hidden h-[55vh] w-[70vw] rounded-full opacity-100 dark:block"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)",
        }}
      />
      <div
        className="ambient-aurora-delayed absolute -right-[15%] bottom-[5%] hidden h-[45vh] w-[55vw] rounded-full opacity-90 dark:block"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 60%)",
        }}
      />
      <div
        className="float-glow-soft absolute left-1/3 top-1/4 hidden h-64 w-64 rounded-full opacity-80 blur-[100px] dark:block"
        style={{ background: "rgba(37, 99, 235, 0.08)" }}
      />
      <img
        src={SITE_BACKGROUND_URL}
        alt=""
        className="absolute inset-0 hidden h-full w-full scale-[1.12] object-cover opacity-[0.14] dark:block"
        style={{ filter: BG_IMAGE_FILTER_DARK }}
        decoding="async"
        fetchPriority="low"
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 40%), radial-gradient(circle at bottom right, rgba(59,130,246,0.12), transparent 35%), linear-gradient(180deg, rgba(2,6,23,0.5) 0%, rgba(3,7,18,0.85) 100%)",
        }}
      />

      <div className="site-noise-overlay absolute inset-0" />
    </div>
  );
}

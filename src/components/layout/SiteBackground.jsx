/**
 * Fundo atmosférico — claro: branco airy com glow suave;
 * escuro: Preto → Grafite com glow discreto na primária.
 */
export default function SiteBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-50 overflow-hidden"
      aria-hidden
    >
      {/* —— Tema claro —— */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(circle at top left, hsl(var(--glow-primary) / 0.10), transparent 35%), radial-gradient(circle at bottom right, hsl(var(--glow-accent) / 0.08), transparent 30%), linear-gradient(180deg, #ffffff 0%, #f8fafc 45%, #f1f5f9 100%)",
        }}
      />
      <div
        className="float-glow-soft absolute left-[15%] top-[8%] h-72 w-72 rounded-full opacity-40 dark:hidden"
        style={{ background: "hsl(var(--glow-primary) / 0.06)" }}
      />
      <div
        className="absolute bottom-[12%] right-[10%] h-56 w-56 rounded-full opacity-30 blur-[80px] dark:hidden"
        style={{ background: "hsl(var(--glow-accent) / 0.12)" }}
      />

      {/* —— Tema escuro: Preto → Grafite —— */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: "linear-gradient(135deg, #0B0D0F 0%, #171A1E 100%)",
        }}
      />
      <div
        className="ambient-aurora absolute left-0 top-0 hidden h-[55vh] w-[70%] max-w-full rounded-full opacity-100 dark:block"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--glow-primary) / 0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="ambient-aurora-delayed absolute right-0 bottom-[5%] hidden h-[45vh] w-[55%] max-w-full rounded-full opacity-90 dark:block"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--glow-accent) / 0.08) 0%, transparent 60%)",
        }}
      />
      <div
        className="float-glow-soft absolute left-1/3 top-1/4 hidden h-64 w-64 rounded-full opacity-70 blur-[100px] dark:block"
        style={{ background: "hsl(var(--glow-primary) / 0.06)" }}
      />

      <div className="site-noise-overlay absolute inset-0" />
    </div>
  );
}

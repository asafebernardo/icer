import { motion } from "framer-motion";

import { usePageBackground } from "@/lib/usePageBackground";
import ResponsivePageBgImage from "@/components/shared/ResponsivePageBgImage";
import AdminPageBgButton from "@/components/shared/AdminPageBgButton";

/**
 * @param {string} [pageKey] — identificador para fundo próprio + botão admin ("postagens", "agenda", …)
 * @param {string} [backgroundImage] — URL fallback quando não há fundo guardado para pageKey
 */
export default function PageHeader({
  tag,
  title,
  description,
  pageKey,
  backgroundImage,
}) {
  const { url, isAdmin, handleFile } = usePageBackground(pageKey);
  const effectiveUrl = url || backgroundImage || "";

  return (
    <section className="relative min-h-[240px] sm:min-h-[280px] lg:min-h-[320px] py-16 lg:py-24 bg-primary overflow-hidden border-b border-primary/20">
      <ResponsivePageBgImage src={effectiveUrl} />

      {/* Overlay: leitura nítida sobre foto */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/88 via-primary/82 to-primary/92 pointer-events-none" />
      <div className="absolute inset-0 bg-primary/25 backdrop-blur-[0.5px] pointer-events-none" />

      {/* Decoração */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-foreground/5 rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl" />
      </div>

      <AdminPageBgButton
        visible={!!pageKey && isAdmin}
        onSelectFile={handleFile}
        className="absolute top-4 right-4 z-20 sm:top-5 sm:right-5"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto px-1"
        >
          {tag && (
            <span className="inline-block text-primary-foreground/95 font-semibold text-xs sm:text-sm tracking-[0.14em] uppercase bg-white/12 px-4 py-2 rounded-full mb-5 border border-white/20 shadow-sm">
              {tag}
            </span>
          )}
          <h1 className="font-display text-balance text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-primary-foreground mt-1 drop-shadow-sm leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-5 text-primary-foreground/80 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto text-balance">
              {description}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

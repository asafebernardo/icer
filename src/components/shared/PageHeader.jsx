import { motion } from "framer-motion";

import { usePageBackground } from "@/lib/usePageBackground";
import ResponsivePageBgImage from "@/components/shared/ResponsivePageBgImage";
import AdminPageBgButton from "@/components/shared/AdminPageBgButton";
import { imageScrimFlat, imageScrimBottom } from "@/lib/imageScrimClasses";

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
  const { url, isAdmin, handleFile, applyUrl } = usePageBackground(pageKey);
  const effectiveUrl = url || backgroundImage || "";
  const hasStoredBg = Boolean((url || "").trim());

  return (
    <section className="relative min-h-[220px] overflow-hidden border-b border-primary/10 bg-primary py-14 dark:border-white/10 dark:bg-brand-surface sm:min-h-[260px] sm:py-16 lg:min-h-[300px] lg:py-20">
      <ResponsivePageBgImage src={effectiveUrl} />

      {effectiveUrl ? (
        <>
          <div className={imageScrimFlat} aria-hidden />
          <div className={imageScrimBottom} aria-hidden />
          <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-primary/55 via-primary/38 to-primary/58 dark:from-brand-surface/70 dark:via-brand-surface/48 dark:to-brand-surface/62" />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/84 to-primary/92 dark:from-brand-surface/94 dark:via-brand-surface/88 dark:to-brand-surface/92" />
      )}
      <div
        className={`pointer-events-none absolute inset-0 z-[4] backdrop-blur-[1px] ${
          effectiveUrl
            ? "bg-primary/12 dark:bg-brand-surface/18"
            : "bg-primary/20 dark:bg-brand-surface/22"
        }`}
      />

      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        <div className="absolute right-0 top-0 h-[min(28rem,90vw)] w-[min(28rem,90vw)] translate-x-1/4 rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 -translate-x-1/3 translate-y-1/3 rounded-full bg-primary-foreground/6 blur-3xl dark:bg-white/8" />
      </div>

      <AdminPageBgButton
        visible={!!pageKey && isAdmin}
        onSelectFile={handleFile}
        onClear={() => applyUrl("")}
        hasBackground={hasStoredBg}
        className="absolute right-4 top-4 z-20 sm:right-5 sm:top-5"
      />

      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-3xl px-1 text-center min-w-0"
        >
          {tag && (
            <span className="mb-5 inline-block rounded-full border border-primary-foreground/25 bg-primary-foreground/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-soft backdrop-blur-sm dark:border-white/25 dark:bg-white/12 dark:text-white sm:text-xs">
              {tag}
            </span>
          )}
          <h1 className="mt-1 font-display text-balance break-words text-3xl font-semibold leading-[1.15] tracking-tight text-primary-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.22)] dark:text-white sm:text-4xl lg:text-[2.65rem]">
            {title}
          </h1>
          {description && (
            <p className="mx-auto mt-5 max-w-2xl text-balance rounded-2xl bg-primary-foreground/[0.14] px-4 py-3.5 text-base font-medium leading-relaxed text-primary-foreground shadow-sm backdrop-blur-sm dark:bg-white/[0.14] dark:text-white sm:px-5 sm:text-lg">
              {description}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

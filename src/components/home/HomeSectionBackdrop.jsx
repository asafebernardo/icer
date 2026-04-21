import { cn } from "@/lib/utils";
import { homeSectionSolidFallback } from "@/lib/homeSectionSolidClasses";

/**
 * Fundo opcional por secção: imagem a tamanho completo, ou azul escuro institucional sem imagem.
 *
 * @param {string} [imageUrl] — data URL ou URL guardada em siteConfig
 * @param {string} [fallbackClassName] — classes quando não há imagem (por defeito: azul escuro)
 * @param {string} [overlayClassName] — véu opcional sobre a imagem (ex.: bg-background/80)
 */
export default function HomeSectionBackdrop({
  imageUrl,
  fallbackClassName = homeSectionSolidFallback,
  overlayClassName = "",
  className,
  children,
}) {
  const has = Boolean(imageUrl?.trim());
  const showOverlay = Boolean(overlayClassName?.trim());

  return (
    <section
      className={cn(
        "relative min-w-0 overflow-x-hidden",
        !has && fallbackClassName,
        className,
      )}
    >
      {has ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          {showOverlay ? (
            <div
              aria-hidden
              className={cn("absolute inset-0", overlayClassName)}
            />
          ) : null}
        </>
      ) : null}
      <div className="relative z-10 min-w-0">{children}</div>
    </section>
  );
}

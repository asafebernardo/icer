/**
 * Imagem de fundo que cobre a área e adapta-se à largura/altura do ecrã (object-cover).
 */
export default function ResponsivePageBgImage({ src, className = "" }) {
  if (!src) return null;
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        sizes="100vw"
        decoding="async"
      />
    </div>
  );
}

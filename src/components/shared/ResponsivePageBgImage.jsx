import { useState, useEffect } from "react";

import {
  CORRUPT_IMAGE_FALLBACK_BG,
  CORRUPT_IMAGE_FALLBACK_IMAGE,
} from "@/lib/corruptImageFallback";

/**
 * Imagem de fundo: cobertura total (hero) ou mosaico (padrões de página).
 * Se o URL falhar (corrompido / 404), usa bloco preto nas mesmas dimensões.
 * @param {{ src: string; className?: string; mode?: "cover" | "tile"; tileBackgroundColor?: string }} props
 */
export default function ResponsivePageBgImage({
  src,
  className = "",
  mode = "cover",
  tileBackgroundColor = "#e1ebf7",
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!src) return undefined;
    if (mode !== "tile") return undefined;
    const im = new Image();
    im.onload = () => setFailed(false);
    im.onerror = () => setFailed(true);
    im.src = src;
    return () => {
      im.onload = null;
      im.onerror = null;
    };
  }, [src, mode]);

  if (!src) return null;

  if (failed) {
    return (
      <div
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{
          backgroundColor: CORRUPT_IMAGE_FALLBACK_BG,
          backgroundImage: `url(${CORRUPT_IMAGE_FALLBACK_IMAGE})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
        aria-hidden
      />
    );
  }

  if (mode === "tile") {
    return (
      <div
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{
          backgroundColor: tileBackgroundColor,
          backgroundImage: `url(${src})`,
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
        aria-hidden
      />
    );
  }

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
        onError={() => setFailed(true)}
      />
    </div>
  );
}

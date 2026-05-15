import { useState } from "react";
import {
  CORRUPT_IMAGE_FALLBACK_BG,
  CORRUPT_IMAGE_FALLBACK_IMAGE,
} from "@/lib/corruptImageFallback";

const RESPONSIVE_WIDTHS = [400, 800, 1280, 1920];

/**
 * Verifica se a URL é um `/api/files/<id>` servido localmente — nesse caso o
 * servidor expõe variantes via `?w=` e `?format=webp`. Para URLs externas ou
 * `data:`, não geramos srcSet.
 */
function isLocalFilesUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:")) return false;
  if (/^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      if (typeof window !== "undefined" && u.host !== window.location.host) {
        return false;
      }
      return /\/api\/files\/\d+(?:[/?]|$)/.test(u.pathname + u.search);
    } catch {
      return false;
    }
  }
  return /^\/api\/files\/\d+(?:[/?]|$)/.test(url);
}

/**
 * Remove `?w=` e `?format=` existentes da URL para construir o base sem variantes.
 */
function stripVariantParams(url) {
  const i = url.indexOf("?");
  if (i === -1) return url;
  const base = url.slice(0, i);
  const qs = new URLSearchParams(url.slice(i + 1));
  qs.delete("w");
  qs.delete("format");
  const tail = qs.toString();
  return tail ? `${base}?${tail}` : base;
}

/**
 * &lt;img&gt; resiliente. Substitui-se por um placeholder sólido em caso de erro.
 *
 * Para imagens servidas em `/api/files/<id>` (mesmo host), gera automaticamente
 * `srcSet` com variantes WebP em vários tamanhos para servir imagens responsivas.
 *
 * @param {{
 *   src?: string | null;
 *   alt?: string;
 *   className?: string;
 *   sizes?: string;
 *   noResponsive?: boolean;
 *   [key: string]: any;
 * }} props
 */
export default function SafeImg({
  src,
  alt = "",
  className,
  onError,
  sizes,
  noResponsive = false,
  loading,
  decoding,
  ...rest
}) {
  const [failed, setFailed] = useState(false);

  const raw = src != null ? String(src).trim() : "";
  const effectiveSrc =
    failed || !raw ? CORRUPT_IMAGE_FALLBACK_IMAGE : raw;

  const useResponsive =
    !noResponsive &&
    !failed &&
    raw &&
    isLocalFilesUrl(raw) &&
    !raw.endsWith(".svg");

  let responsiveProps = {};
  if (useResponsive) {
    const base = stripVariantParams(raw);
    const sep = base.includes("?") ? "&" : "?";
    const srcSet = RESPONSIVE_WIDTHS.map(
      (w) => `${base}${sep}w=${w}&format=webp ${w}w`,
    ).join(", ");
    responsiveProps = {
      src: `${base}${sep}w=1280&format=webp`,
      srcSet,
      sizes: sizes ?? "(max-width: 768px) 100vw, 50vw",
    };
  }

  return (
    <img
      src={responsiveProps.src ?? effectiveSrc}
      srcSet={responsiveProps.srcSet}
      sizes={responsiveProps.sizes}
      alt={alt}
      className={className}
      loading={loading ?? "lazy"}
      decoding={decoding ?? "async"}
      onError={(e) => {
        if (!failed && raw) {
          setFailed(true);
        } else if (!failed && !raw) {
          setFailed(true);
        }
        if (!raw || failed) {
          e.currentTarget.src = "";
          e.currentTarget.style.backgroundColor = CORRUPT_IMAGE_FALLBACK_BG;
        }
        onError?.(e);
      }}
      {...rest}
    />
  );
}

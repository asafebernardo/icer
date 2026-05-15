import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  CORRUPT_IMAGE_FALLBACK_BG,
  CORRUPT_IMAGE_FALLBACK_IMAGE,
} from "@/lib/corruptImageFallback";

/**
 * &lt;img&gt; que, em erro de carregamento, torna-se um bloco sólido preto (mesmas classes).
 * Sem `src`, não renderiza nada.
 *
 * @param {{ src?: string | null; alt?: string; className?: string; [key: string]: any }} props
 */
export default function SafeImg({ src, alt = "", className, onError, ...rest }) {
  const [failed, setFailed] = useState(false);

  const raw = src != null ? String(src).trim() : "";
  const handleError = useCallback(
    (e) => {
      setFailed(true);
      onError?.(e);
    },
    [onError],
  );

  const effectiveSrc =
    failed || !raw ? CORRUPT_IMAGE_FALLBACK_IMAGE : raw;

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        // Evita loop infinito caso a imagem de fallback também falhe.
        if (!failed && raw) {
          setFailed(true);
        } else if (!failed && !raw) {
          // Se nem `raw` existe, mantém apenas fundo sólido.
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

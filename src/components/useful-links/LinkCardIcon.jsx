import { useState, useEffect, useMemo } from "react";
import { Link2 } from "lucide-react";
import { resolveLinkIconCandidates } from "@/lib/linkIcons";
import { cn } from "@/lib/utils";
import { CORRUPT_IMAGE_FALLBACK_BG } from "@/lib/corruptImageFallback";

/**
 * Ícone do link: imagem (manual ou favicon); sem URLs → Lucide Link2;
 * se todas as URLs falharem → quadrado preto.
 */
export function LinkCardIcon({ link, className }) {
  const candidates = useMemo(
    () => resolveLinkIconCandidates(link),
    [link?.id, link?.url, link?.icone_url],
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [link?.id, link?.url, link?.icone_url]);

  if (!candidates.length) {
    return (
      <Link2
        className={cn("w-4 h-4 text-accent shrink-0", className)}
        aria-hidden
      />
    );
  }

  if (idx >= candidates.length) {
    return (
      <span
        className={cn("w-5 h-5 rounded shrink-0 block", className)}
        style={{ backgroundColor: CORRUPT_IMAGE_FALLBACK_BG }}
        aria-hidden
      />
    );
  }

  const src = candidates[idx];

  return (
    <img
      src={src}
      alt=""
      className={cn(
        "w-5 h-5 rounded object-contain shrink-0 bg-muted/40",
        className,
      )}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

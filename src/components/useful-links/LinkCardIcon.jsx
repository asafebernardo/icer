import { useState, useEffect, useMemo } from "react";
import { Link2 } from "lucide-react";
import { resolveLinkIconCandidates } from "@/lib/linkIcons";
import { cn } from "@/lib/utils";

/**
 * Ícone do link: imagem (manual ou favicon) ou ícone Lucide se tudo falhar.
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

  if (!candidates.length || idx >= candidates.length) {
    return (
      <Link2
        className={cn("w-4 h-4 text-accent shrink-0", className)}
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

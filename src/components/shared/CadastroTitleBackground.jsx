import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const ROTATE_MS = 6500;

/**
 * Fundo do cartão a partir do cadastro (uma ou várias imagens em ciclo).
 */
export default function CadastroTitleBackground({
  urls,
  className,
  overlayClassName,
}) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const t = window.setInterval(
      () => setIdx((i) => (i + 1) % list.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(t);
  }, [list.length]);

  const listKey = list.join("\n");
  useEffect(() => {
    setIdx(0);
  }, [listKey]);

  if (!list.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      {list.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out",
            i === idx ? "z-[1] opacity-100" : "z-0 opacity-0",
          )}
          style={{ backgroundImage: `url(${url})` }}
        />
      ))}
      <div
        className={cn(
          "absolute inset-0 z-[2]",
          overlayClassName ??
            "bg-card/82 backdrop-blur-[1px] dark:bg-card/78",
        )}
      />
    </div>
  );
}

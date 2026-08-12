import { memo, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

import SafeImg from "@/components/shared/SafeImg";
import { cn } from "@/lib/utils";

interface HistoryImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  /** Expande a imagem para ocupar o máximo do container mantendo proporção */
  fill?: boolean;
}

function HistoryImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  fill = false,
}: HistoryImageProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const probe = new Image();
    probe.src = src;
    if (probe.complete) {
      setLoaded(true);
    }
  }, [src]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setLoaded(true);
  }, []);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        "bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,hsl(var(--muted-foreground)/0.06),transparent_70%)]",
        fill && "h-full min-h-0 w-full",
        className,
      )}
    >
      {!loaded ? (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/80 to-muted/50"
          aria-hidden
        />
      ) : null}

      <motion.div
        initial={false}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 0.985 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "flex max-h-full max-w-full items-center justify-center",
          fill ? "h-full w-full min-h-0" : "h-full w-full",
        )}
      >
        <SafeImg
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            // Contém a imagem no box sem cortar (respeita proporção)
            "max-h-full max-w-full object-contain",
            fill ? "h-auto w-auto" : "h-auto w-auto",
            imgClassName,
          )}
        />
      </motion.div>
    </div>
  );
}

export default memo(HistoryImage);

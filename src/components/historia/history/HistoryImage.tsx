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
        "bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,rgba(255,255,255,0.04),transparent_70%)]",
        fill && "min-h-[inherit]",
        className,
      )}
    >
      {!loaded ? (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.03] via-white/[0.06] to-white/[0.02]"
          aria-hidden
        />
      ) : null}

      <motion.div
        initial={false}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 0.985 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "flex w-full items-center justify-center",
          fill ? "h-full min-h-[inherit]" : "h-full",
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
            fill
              ? "h-auto w-full max-w-full object-contain"
              : "max-h-full max-w-full object-contain",
            imgClassName,
          )}
        />
      </motion.div>
    </div>
  );
}

export default memo(HistoryImage);

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CORRUPT_IMAGE_FALLBACK_BG,
  CORRUPT_IMAGE_FALLBACK_IMAGE,
} from "@/lib/corruptImageFallback";
import usePrefersReducedMotion from "@/lib/usePrefersReducedMotion";

function imgClassForFit(fit) {
  const base = "absolute inset-0 h-full w-full object-center pointer-events-none";
  if (fit === "fill") return `${base} object-fill`;
  if (fit === "contain") return `${base} object-contain`;
  return `${base} object-cover`;
}

/**
 * Carrossel de fundo (esmaecer ou deslize) — mesma lógica do hero.
 * @param {string[]} urls
 * @param {number} rotateIntervalMs
 * @param {number} transitionMs
 * @param {"fade"|"slide"} transitionMode
 */
export default function BackgroundSlideshow({
  urls,
  rotateIntervalMs,
  transitionMs,
  transitionMode,
  fit = "cover",
}) {
  const clean = (urls || []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [slideFailed, setSlideFailed] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    setIndex(0);
  }, [clean.length, clean.join("|")]);

  useEffect(() => {
    setSlideFailed(false);
  }, [index, clean.length, clean.join("|")]);

  useEffect(() => {
    if (clean.length <= 1) return undefined;
    if (reduceMotion) return undefined;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % clean.length);
    }, rotateIntervalMs);
    return () => window.clearInterval(t);
  }, [clean.length, rotateIntervalMs, reduceMotion]);

  if (clean.length === 0) return null;

  const durSec = reduceMotion ? 0 : transitionMs / 1000;

  const failClass = cn(imgClassForFit(fit), "!bg-black");
  const failStyle = {
    backgroundColor: CORRUPT_IMAGE_FALLBACK_BG,
    backgroundImage: `url(${CORRUPT_IMAGE_FALLBACK_IMAGE})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",
  };

  if (clean.length === 1) {
    if (slideFailed) {
      return <div className={failClass} style={failStyle} aria-hidden />;
    }
    return (
      <img
        src={clean[0]}
        alt=""
        className={imgClassForFit(fit)}
        onError={() => setSlideFailed(true)}
      />
    );
  }

  return (
    <AnimatePresence initial={false} mode="sync">
      {slideFailed ? (
        <motion.div
          key={`fail-${index}`}
          className={failClass}
          style={failStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: durSec }}
          aria-hidden
        />
      ) : (
        <motion.img
          key={index}
          src={clean[index]}
          alt=""
          className={imgClassForFit(fit)}
          onError={() => setSlideFailed(true)}
          initial={
            transitionMode === "slide"
              ? { x: "100%", opacity: 1 }
              : { opacity: 0 }
          }
          animate={{ x: 0, opacity: 1 }}
          exit={
            transitionMode === "slide"
              ? { x: "-100%", opacity: 1 }
              : { opacity: 0 }
          }
          transition={{
            duration: durSec,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      )}
    </AnimatePresence>
  );
}

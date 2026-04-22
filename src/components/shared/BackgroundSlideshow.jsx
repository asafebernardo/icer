import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    setIndex(0);
  }, [clean.length, clean.join("|")]);

  useEffect(() => {
    if (clean.length <= 1) return undefined;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % clean.length);
    }, rotateIntervalMs);
    return () => window.clearInterval(t);
  }, [clean.length, rotateIntervalMs]);

  if (clean.length === 0) return null;

  const durSec = transitionMs / 1000;

  if (clean.length === 1) {
    return <img src={clean[0]} alt="" className={imgClassForFit(fit)} />;
  }

  return (
    <AnimatePresence initial={false} mode="sync">
      <motion.img
        key={index}
        src={clean[index]}
        alt=""
        className={imgClassForFit(fit)}
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
    </AnimatePresence>
  );
}

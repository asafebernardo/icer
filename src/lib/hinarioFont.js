import { useCallback, useState } from "react";

const STORAGE_KEY = "icer_hinario_font_px";
const MIN = 16;
const MAX = 32;
const STEP = 2;
const DEFAULT = 18;

function readStoredSize() {
  if (typeof window === "undefined") return DEFAULT;
  const n = Number(window.localStorage.getItem(STORAGE_KEY));
  if (!Number.isFinite(n)) return DEFAULT;
  return Math.min(MAX, Math.max(MIN, Math.round(n)));
}

/** Tamanho da letra do hinário, guardado neste navegador. */
export function useHinarioFontSize() {
  const [size, setSize] = useState(readStoredSize);

  const apply = useCallback((next) => {
    const v = Math.min(MAX, Math.max(MIN, next));
    setSize(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      /* quota ou modo privado */
    }
  }, []);

  const decrease = useCallback(() => apply(size - STEP), [apply, size]);
  const increase = useCallback(() => apply(size + STEP), [apply, size]);

  return {
    size,
    decrease,
    increase,
    canDecrease: size > MIN,
    canIncrease: size < MAX,
  };
}

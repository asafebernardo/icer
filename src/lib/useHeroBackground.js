import { useState, useEffect, useCallback } from "react";

import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { getUser, canMenuAction, MENU } from "@/lib/auth";

const DEFAULT_ROTATE_MS = 4000;
const DEFAULT_TRANSITION_MS = 700;

function readCanEditHero() {
  const u = getUser();
  return canMenuAction(u, MENU.HOME, "edit");
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Lê array de URLs do hero (migra fundo único antigo). */
export function readHeroSlides() {
  const cfg = getSiteConfig();
  if (Array.isArray(cfg.homeHeroSlides) && cfg.homeHeroSlides.length > 0) {
    return cfg.homeHeroSlides.filter(Boolean);
  }
  const single = cfg.pageBackgrounds?.home || cfg.heroBg || "";
  return single ? [single] : [];
}

/** Intervalo entre trocas, duração da animação e modo (fade | slide). */
export function readHeroSettings() {
  const cfg = getSiteConfig();
  const transitionMs = clamp(
    Number(cfg.homeHeroTransitionMs) || DEFAULT_TRANSITION_MS,
    250,
    8000,
  );
  let rotateIntervalMs = clamp(
    Number(cfg.homeHeroRotateIntervalMs) || DEFAULT_ROTATE_MS,
    1500,
    120000,
  );
  if (rotateIntervalMs < transitionMs + 350) {
    rotateIntervalMs = transitionMs + 350;
  }
  const transitionMode =
    cfg.homeHeroTransitionMode === "slide" ? "slide" : "fade";
  return { rotateIntervalMs, transitionMs, transitionMode };
}

function persistHeroSlides(urls) {
  const clean = urls.filter(Boolean);
  const cfg = getSiteConfig();
  const first = clean[0] || "";
  setSiteConfig({
    homeHeroSlides: clean,
    pageBackgrounds: { ...(cfg.pageBackgrounds || {}), home: first },
    heroBg: first,
  });
}

export function useHeroBackground() {
  const [slides, setSlides] = useState(readHeroSlides);
  const [settings, setSettings] = useState(readHeroSettings);
  const [isAdmin, setIsAdmin] = useState(readCanEditHero);

  const sync = useCallback(() => {
    setSlides(readHeroSlides());
    setSettings(readHeroSettings());
    setIsAdmin(readCanEditHero());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("icer-site-config", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("icer-member-permissions", sync);
    window.addEventListener("icer-user-session", sync);
    return () => {
      window.removeEventListener("icer-site-config", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("icer-member-permissions", sync);
      window.removeEventListener("icer-user-session", sync);
    };
  }, [sync]);

  const setHeroSlides = useCallback((urls) => {
    persistHeroSlides(urls);
    setSlides(urls.filter(Boolean));
  }, []);

  const appendFromFiles = useCallback(async (fileList) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const urls = await Promise.all(
      files.map((f) => imageFileToStorableUrl(f)),
    );
    const next = [...readHeroSlides(), ...urls];
    setHeroSlides(next);
  }, [setHeroSlides]);

  const removeAt = useCallback(
    (index) => {
      const cur = readHeroSlides();
      const next = cur.filter((_, i) => i !== index);
      setHeroSlides(next);
    },
    [setHeroSlides],
  );

  const clearAll = useCallback(() => {
    setHeroSlides([]);
  }, [setHeroSlides]);

  const updateHeroSettings = useCallback((patch) => {
    const cfg = getSiteConfig();
    const merged = { ...cfg, ...patch };
    const transitionMs = clamp(
      Number(merged.homeHeroTransitionMs) || DEFAULT_TRANSITION_MS,
      250,
      8000,
    );
    let rotateIntervalMs = clamp(
      Number(merged.homeHeroRotateIntervalMs) || DEFAULT_ROTATE_MS,
      1500,
      120000,
    );
    if (rotateIntervalMs < transitionMs + 350) {
      rotateIntervalMs = transitionMs + 350;
    }
    const transitionMode =
      merged.homeHeroTransitionMode === "slide" ? "slide" : "fade";
    setSiteConfig({
      homeHeroTransitionMs: transitionMs,
      homeHeroRotateIntervalMs: rotateIntervalMs,
      homeHeroTransitionMode: transitionMode,
    });
    setSettings(readHeroSettings());
  }, []);

  return {
    slides,
    isAdmin,
    setHeroSlides,
    appendFromFiles,
    removeAt,
    clearAll,
    rotateIntervalMs: settings.rotateIntervalMs,
    transitionMs: settings.transitionMs,
    transitionMode: settings.transitionMode,
    updateHeroSettings,
  };
}

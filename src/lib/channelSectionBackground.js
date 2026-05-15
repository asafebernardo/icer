import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";

const DEFAULT_ROTATE_MS = 4000;
const DEFAULT_TRANSITION_MS = 700;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Migra `sectionBgChannel` (imagem única) para array. */
export function readChannelSlides() {
  const cfg = getSiteConfig();
  if (
    Array.isArray(cfg.channelSectionSlides) &&
    cfg.channelSectionSlides.length > 0
  ) {
    return cfg.channelSectionSlides.filter(Boolean);
  }
  const legacy = cfg.sectionBgChannel;
  return legacy ? [legacy] : [];
}

/** Intervalo, duração e modo — mesma lógica do hero. */
export function readChannelSettings() {
  const cfg = getSiteConfig();
  const transitionMs = clamp(
    Number(cfg.channelSectionTransitionMs) || DEFAULT_TRANSITION_MS,
    250,
    8000,
  );
  let rotateIntervalMs = clamp(
    Number(cfg.channelSectionRotateIntervalMs) || DEFAULT_ROTATE_MS,
    1500,
    120000,
  );
  if (rotateIntervalMs < transitionMs + 350) {
    rotateIntervalMs = transitionMs + 350;
  }
  const transitionMode =
    cfg.channelSectionTransitionMode === "slide" ? "slide" : "fade";
  return { rotateIntervalMs, transitionMs, transitionMode };
}

export function persistChannelSlides(urls) {
  const clean = urls.filter(Boolean);
  setSiteConfig({
    channelSectionSlides: clean,
  });
}

export function persistChannelSettings(patch) {
  const cfg = getSiteConfig();
  const merged = { ...cfg, ...patch };
  const transitionMs = clamp(
    Number(merged.channelSectionTransitionMs) || DEFAULT_TRANSITION_MS,
    250,
    8000,
  );
  let rotateIntervalMs = clamp(
    Number(merged.channelSectionRotateIntervalMs) || DEFAULT_ROTATE_MS,
    1500,
    120000,
  );
  if (rotateIntervalMs < transitionMs + 350) {
    rotateIntervalMs = transitionMs + 350;
  }
  const transitionMode =
    merged.channelSectionTransitionMode === "slide" ? "slide" : "fade";
  setSiteConfig({
    channelSectionTransitionMs: transitionMs,
    channelSectionRotateIntervalMs: rotateIntervalMs,
    channelSectionTransitionMode: transitionMode,
  });
}

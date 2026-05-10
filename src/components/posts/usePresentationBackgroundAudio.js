import { useEffect, useRef, useState } from "react";

/**
 * Música de fundo na apresentação: reproduz em loop; pausa quando um vídeo (ficheiro
 * ou YouTube) está com som ligado; retoma ao mudar de slide ou ao silenciar o vídeo.
 *
 * @param {{
 *   audioUrl: string;
 *   enabled?: boolean;
 *   active?: boolean;
 *   slideIndex: number;
 *   slideKind?: "image" | "video" | "youtube";
 *   youtubeSoundOn?: boolean;
 * }} p
 */
export function usePresentationBackgroundAudio({
  audioUrl,
  enabled = true,
  active = true,
  slideIndex,
  slideKind,
  youtubeSoundOn = false,
}) {
  const audioRef = useRef(null);
  const [fileVideoSoundOn, setFileVideoSoundOn] = useState(false);

  useEffect(() => {
    setFileVideoSoundOn(false);
  }, [slideIndex]);

  const onFileVideoVolumeChange = (e) => {
    const v = e?.currentTarget;
    if (!v) return;
    setFileVideoSoundOn(!v.muted && v.volume > 0);
  };

  const blockedByVideoSound =
    slideKind === "video" && fileVideoSoundOn;
  const blockedByYoutubeSound =
    slideKind === "youtube" && youtubeSoundOn;
  const shouldPlay =
    !!String(audioUrl || "").trim() &&
    enabled &&
    active &&
    !blockedByVideoSound &&
    !blockedByYoutubeSound;

  useEffect(() => {
    const el = audioRef.current;
    const url = String(audioUrl || "").trim();
    if (!el || !url || !enabled || !active) {
      try {
        el?.pause?.();
      } catch {
        /* ignore */
      }
      return;
    }
    el.loop = true;
    if (el.getAttribute("src") !== url) {
      el.src = url;
    }
    if (shouldPlay) {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      try {
        el.pause();
      } catch {
        /* ignore */
      }
    }
  }, [audioUrl, enabled, active, shouldPlay]);

  return { audioRef, onFileVideoVolumeChange };
}

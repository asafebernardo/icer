import {
  useState,
  useEffect,
  useRef,
  useId,
  useMemo,
} from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import SafeImg from "@/components/shared/SafeImg";
import { POST_IMAGE_PRESENTATION_EVENT } from "@/lib/posts";
import { usePresentationBackgroundAudio } from "@/components/posts/usePresentationBackgroundAudio";

/** Carrega a API iframe do YouTube (player + eventos). */
let youtubeApiPromise = null;
function loadYoutubeIframeAPI() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const done = () => resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.();
      } finally {
        done();
      }
    };
    if (
      !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    ) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
  return youtubeApiPromise;
}

/**
 * Escuta `POST_IMAGE_PRESENTATION_EVENT` e mostra slides (imagem, vídeo, YouTube).
 */
export default function PostImagePresentationHost() {
  const [presentation, setPresentation] = useState(null);
  const presentationContainerRef = useRef(null);
  const presentationFsRequestedRef = useRef(false);
  const ytPlayerRef = useRef(null);
  const rawYtId = useId();
  const youtubePresentationDomId = useMemo(
    () => `yt-fs-${rawYtId.replace(/:/g, "")}`,
    [rawYtId],
  );
  const [youtubeSoundOn, setYoutubeSoundOn] = useState(false);

  useEffect(() => {
    const handler = (ev) => {
      const detail = ev?.detail;
      if (!detail) return;
      let slides = [];
      if (Array.isArray(detail.slides) && detail.slides.length) {
        slides = detail.slides;
      } else if (Array.isArray(detail.urls) && detail.urls.length) {
        slides = detail.urls.map((url) => ({ kind: "image", url }));
      }
      if (!slides.length) return;
      const idx = Number.isFinite(detail.initialIndex)
        ? detail.initialIndex
        : 0;
      const audioAmbienteUrl = String(detail.audioAmbienteUrl ?? "").trim();
      const bgMusicAllowed = detail.bgMusicAllowed !== false;
      setPresentation({
        slides,
        index: Math.max(0, Math.min(idx, slides.length - 1)),
        audioAmbienteUrl,
        bgMusicAllowed,
      });
    };
    window.addEventListener(POST_IMAGE_PRESENTATION_EVENT, handler);
    return () =>
      window.removeEventListener(POST_IMAGE_PRESENTATION_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!presentation) {
      presentationFsRequestedRef.current = false;
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          void document.exitFullscreen();
        } else if (
          document.webkitFullscreenElement &&
          document.webkitExitFullscreen
        ) {
          document.webkitExitFullscreen();
        }
      } catch {
        /* ignore */
      }
      return;
    }
    if (presentationFsRequestedRef.current) return;
    presentationFsRequestedRef.current = true;
    const t = window.setTimeout(() => {
      const el = presentationContainerRef.current;
      if (!el) return;
      try {
        if (el.requestFullscreen) void el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } catch {
        /* recusado ou indisponível */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [presentation]);

  const slide =
    presentation?.slides?.length && presentation.slides[presentation.index]
      ? presentation.slides[presentation.index]
      : null;

  useEffect(() => {
    if (!presentation || !slide || slide.kind !== "youtube") {
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
      setYoutubeSoundOn(false);
      return;
    }

    let cancelled = false;
    loadYoutubeIframeAPI().then(() => {
      if (cancelled || typeof window.YT?.Player !== "function") return;
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      const player = new window.YT.Player(youtubePresentationDomId, {
        videoId: slide.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              setPresentation((curr) => {
                if (!curr?.slides?.length) return curr;
                const n = curr.slides.length;
                return {
                  ...curr,
                  index: (curr.index + 1) % n,
                };
              });
            }
          },
        },
      });
      ytPlayerRef.current = player;
    });

    return () => {
      cancelled = true;
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
    };
  }, [presentation, slide, youtubePresentationDomId]);

  useEffect(() => {
    if (!presentation || !slide || slide.kind !== "youtube") {
      setYoutubeSoundOn(false);
      return;
    }
    const id = window.setInterval(() => {
      try {
        const p = ytPlayerRef.current;
        if (!p || typeof p.isMuted !== "function") return;
        setYoutubeSoundOn(!p.isMuted());
      } catch {
        setYoutubeSoundOn(false);
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [presentation, slide]);

  const bgUrl =
    presentation?.bgMusicAllowed !== false && presentation?.audioAmbienteUrl
      ? String(presentation.audioAmbienteUrl).trim()
      : "";

  const { audioRef, onFileVideoVolumeChange } = usePresentationBackgroundAudio({
    audioUrl: bgUrl,
    enabled: true,
    active: !!presentation,
    slideIndex: presentation?.index ?? 0,
    slideKind: slide?.kind,
    youtubeSoundOn,
  });

  if (!presentation || !slide) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setPresentation(null);
      }}
    >
      <DialogContent className="max-w-[min(100vw,72rem)] max-h-[95vh] w-[calc(100vw-2rem)] overflow-hidden border-0 bg-black p-0 sm:max-w-5xl">
        <div
          ref={presentationContainerRef}
          className="relative flex max-h-[95vh] min-h-[260px] w-full flex-col bg-black"
        >
          {bgUrl ? (
            <audio
              ref={audioRef}
              className="sr-only"
              preload="metadata"
              aria-hidden="true"
            />
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute right-3 top-3 z-20 gap-2 shadow-lg"
            onClick={() => setPresentation(null)}
            aria-label="Fechar apresentação"
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Fechar</span>
          </Button>
          <div className="relative flex flex-1 items-center justify-center bg-black">
            {slide.kind === "image" ? (
              <SafeImg
                src={slide.url}
                alt=""
                className="max-h-[85vh] h-full w-full object-contain bg-black"
              />
            ) : slide.kind === "video" ? (
              <video
                key={slide.url}
                src={slide.url}
                controls
                autoPlay
                muted
                playsInline
                className="max-h-[85vh] h-full w-full object-contain"
                onVolumeChange={onFileVideoVolumeChange}
              />
            ) : (
              <div
                id={youtubePresentationDomId}
                role="region"
                aria-label="YouTube"
                className="aspect-video max-h-[85vh] min-h-[240px] w-full bg-black"
              />
            )}
            {presentation.slides.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
                  onClick={() =>
                    setPresentation((curr) => {
                      if (!curr) return curr;
                      const n = curr.slides.length;
                      return {
                        ...curr,
                        index: (curr.index - 1 + n) % n,
                      };
                    })
                  }
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Seguinte"
                  className="absolute right-14 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 sm:right-16"
                  onClick={() =>
                    setPresentation((curr) => {
                      if (!curr) return curr;
                      const n = curr.slides.length;
                      return {
                        ...curr,
                        index: (curr.index + 1) % n,
                      };
                    })
                  }
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {presentation.slides.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 bg-black/90 py-3">
              {presentation.slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === presentation.index
                      ? "w-6 bg-white"
                      : "w-2 bg-white/40"
                  }`}
                  onClick={() =>
                    setPresentation((curr) =>
                      curr ? { ...curr, index: i } : curr,
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

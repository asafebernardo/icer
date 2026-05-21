import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Maximize2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import SafeImg from "@/components/shared/SafeImg";
import MediaKindCornerBadge from "@/components/shared/MediaKindCornerBadge";
import SlideMediaCaption from "@/components/posts/SlideMediaCaption";
import { usePresentationBackgroundAudio } from "@/components/posts/usePresentationBackgroundAudio";
import { getSlideCaptionLabel } from "@/lib/posts";
import { cn } from "@/lib/utils";

function isVisualMime(mime) {
  return (
    typeof mime === "string" &&
    (mime.startsWith("image/") || mime.startsWith("video/"))
  );
}

/** Reordena anexos visuais (imagem + vídeo ficheiro); resto mantém posição. */
function reorderVisualAttachmentsInAnexos(anexos, sourceIndex, destIndex) {
  const base = Array.isArray(anexos) ? [...anexos] : [];
  const visualOnly = base.filter(
    (a) => a?.url && isVisualMime(a.mime),
  );
  if (visualOnly.length <= 1 || sourceIndex === destIndex) return base;
  const reordered = [...visualOnly];
  const [removed] = reordered.splice(sourceIndex, 1);
  reordered.splice(destIndex, 0, removed);
  let k = 0;
  return base.map((a) => {
    if (a?.url && isVisualMime(a.mime)) {
      return reordered[k++];
    }
    return a;
  });
}

function slideThumbSrc(slide) {
  if (!slide) return "";
  if (slide.kind === "youtube") {
    return `https://img.youtube.com/vi/${slide.videoId}/hqdefault.jpg`;
  }
  return slide.url || "";
}

function slideGalleryBadgeKind(slide) {
  if (!slide) return "image";
  if (slide.kind === "video" || slide.kind === "youtube") return "video";
  return "image";
}

/** Remove um slide na grelha da galeria (edição/criação de postagens). */
function GallerySlideRemoveButton({ slideIndex, onRemoveGallerySlide }) {
  if (typeof onRemoveGallerySlide !== "function") return null;
  return (
    <button
      type="button"
      className="absolute left-1 bottom-1 z-[35] flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/95 text-destructive shadow-sm transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRemoveGallerySlide(slideIndex);
      }}
      aria-label={`Remover arquivo — slide ${slideIndex + 1}`}
    >
      <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );
}

/** Carrega uma vez a API `iframe` do YouTube (player + evento ENDED). */
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
 * Miniatura na lista: estrela em fotos e vídeos de anexo.
 * Sem estrela explícita, só a 1.ª imagem é destaque (vídeo exige estrela).
 */
export function GalleryFeaturedStar({ src, starCtl, defaultThumbUrl }) {
  if (!starCtl?.onChange) return null;
  const explicit = String(starCtl.value ?? "").trim();
  const fallback = String(defaultThumbUrl ?? "").trim();
  const isActive =
    (explicit && explicit === src) ||
    (!explicit && fallback && src === fallback);
  return (
    <button
      type="button"
      className="absolute right-1 top-1 z-30 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/95 text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isActive) starCtl.onChange("");
        else starCtl.onChange(src);
      }}
      aria-label={
        isActive
          ? "Remover miniatura de destaque na lista"
          : "Destacar como miniatura na lista de publicações"
      }
      aria-pressed={isActive}
    >
      <Star
        className={`h-4 w-4 shrink-0 ${
          isActive
            ? "fill-amber-400 text-amber-400 drop-shadow"
            : "fill-transparent text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
        }`}
        strokeWidth={2}
      />
    </button>
  );
}

/**
 * Abas «Apresentação» e «Galeria». Slides: imagem, vídeo (ficheiro) ou YouTube.
 */
export default function PostImagesBlock({
  /** Preferência: slides mistos ({ kind, url | videoId }) */
  slides: slidesProp,
  /** Legado: só URLs de imagem */
  images,
  intervalSec = 5,
  showFullscreenEntry = false,
  onSlideImageActivate,
  onFullscreenButton,
  adminGallery = null,
  starFeatured = null,
  showMediaKindBadge = false,
  /** `(índice)` — remove um anexo/slide na aba Galeria (ex.: editor de postagens). */
  onRemoveGallerySlide = null,
  /** URL de áudio — música de fundo na apresentação (campo `audio_ambiente_url` do post). */
  audioAmbienteUrl = "",
  /** Se false (ex.: secção sem música em modo «por secção»), não reproduz o áudio. */
  audioAmbienteAtivo = true,
  /** Só a aba grelha de miniaturas (ex.: editor — etapa multimídia). */
  galleryOnly = false,
}) {
  const slides = useMemo(() => {
    if (Array.isArray(slidesProp) && slidesProp.length) {
      return slidesProp.filter((s) => s && (s.url || s.videoId));
    }
    const urls = Array.isArray(images) ? images.filter(Boolean) : [];
    return urls.map((url) => ({ kind: "image", url }));
  }, [slidesProp, images]);

  const imageUrlsForStar = useMemo(
    () => slides.filter((s) => s.kind === "image").map((s) => s.url),
    [slides],
  );
  const defaultListThumbUrl = imageUrlsForStar[0] || "";

  const starCtl =
    typeof adminGallery?.onImagemDestaqueChange === "function"
      ? {
          value: String(adminGallery.imagemDestaqueUrl ?? "").trim(),
          onChange: adminGallery.onImagemDestaqueChange,
        }
      : typeof starFeatured?.onImagemDestaqueChange === "function"
        ? {
            value: String(starFeatured.imagemDestaqueUrl ?? "").trim(),
            onChange: starFeatured.onImagemDestaqueChange,
          }
        : null;

  const [slideIndex, setSlideIndex] = useState(0);
  const [delaySec, setDelaySec] = useState(() =>
    Math.min(60, Math.max(2, Number(intervalSec) || 5)),
  );
  const [activeTab, setActiveTab] = useState(
    () => (galleryOnly ? "galeria" : "apresentacao"),
  );
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [youtubeSoundOn, setYoutubeSoundOn] = useState(false);

  const safeIndex = useMemo(
    () => (slides.length ? Math.min(slideIndex, slides.length - 1) : 0),
    [slideIndex, slides.length],
  );
  const currentSlidePreview = slides.length ? slides[safeIndex] : undefined;

  const imageAdvanceTimerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const rawYtId = useId();
  const youtubePresentationDomId = useMemo(
    () => `yt-carousel-${rawYtId.replace(/:/g, "")}`,
    [rawYtId],
  );

  const advanceCarousel = useCallback(() => {
    setSlideIndex((i) => {
      const n = slides.length;
      return n ? (i + 1) % n : 0;
    });
  }, [slides.length]);

  const canOpenFullscreen =
    typeof onFullscreenButton === "function" ||
    typeof onSlideImageActivate === "function";

  useEffect(() => {
    if (galleryOnly) setActiveTab("galeria");
  }, [galleryOnly]);

  useEffect(() => {
    setDelaySec(Math.min(60, Math.max(2, Number(intervalSec) || 5)));
  }, [intervalSec]);

  useEffect(() => {
    setSlideIndex((i) =>
      slides.length ? Math.min(i, slides.length - 1) : 0,
    );
  }, [slides]);

  /** Carrossel automático com temporizador só em slides de imagem; vídeo/YouTube avançam ao terminar. */
  useEffect(() => {
    if (imageAdvanceTimerRef.current != null) {
      clearTimeout(imageAdvanceTimerRef.current);
      imageAdvanceTimerRef.current = null;
    }
    if (!slides.length || slides.length <= 1) return;
    if (activeTab !== "apresentacao") return;
    const slide = slides[safeIndex];
    if (!slide || slide.kind !== "image") return;

    imageAdvanceTimerRef.current = window.setTimeout(() => {
      advanceCarousel();
    }, delaySec * 1000);

    return () => {
      if (imageAdvanceTimerRef.current != null) {
        clearTimeout(imageAdvanceTimerRef.current);
        imageAdvanceTimerRef.current = null;
      }
    };
  }, [
    slides,
    safeIndex,
    delaySec,
    activeTab,
    slides.length,
    advanceCarousel,
  ]);

  useEffect(() => {
    if (!slides.length || activeTab !== "apresentacao") {
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
      return;
    }
    const slide = slides[safeIndex];
    if (!slide || slide.kind !== "youtube") {
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
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
          autoplay: 0,
          mute: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              setSlideIndex((i) => {
                const n = slides.length;
                return n ? (i + 1) % n : 0;
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
  }, [activeTab, safeIndex, slides, youtubePresentationDomId]);

  useEffect(() => {
    if (activeTab !== "apresentacao") {
      setYoutubeSoundOn(false);
      return;
    }
    const slide = slides[safeIndex];
    if (!slide || slide.kind !== "youtube") {
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
  }, [activeTab, safeIndex, slides]);

  const slideKindForAudio = slides[safeIndex]?.kind;

  const { audioRef, onFileVideoVolumeChange } = usePresentationBackgroundAudio({
    audioUrl: String(audioAmbienteUrl || "").trim(),
    enabled: audioAmbienteAtivo !== false,
    active: activeTab === "apresentacao",
    slideIndex: safeIndex,
    slideKind: slideKindForAudio,
    youtubeSoundOn,
  });

  if (!slides.length) {
    if (galleryOnly) {
      return (
        <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-4 py-10 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            Sem miniaturas — envie ficheiros multimídia ou defina vídeos do
            YouTube neste formulário para preencher a grelha.
          </p>
        </div>
      );
    }
    return (
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex flex-wrap items-center gap-2 sm:justify-between sm:gap-3">
          <TabsList className="grid h-auto min-h-10 min-w-0 flex-1 grid-cols-2 rounded-xl p-1 sm:inline-flex sm:w-auto sm:flex-initial">
            <TabsTrigger
              value="apresentacao"
              className="rounded-lg px-4 py-2 text-sm font-medium"
            >
              Apresentação
            </TabsTrigger>
            <TabsTrigger
              value="galeria"
              className="rounded-lg px-4 py-2 text-sm font-medium"
            >
              Galeria
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="apresentacao" className="mt-4 space-y-4 outline-none">
          <div className="relative flex aspect-video flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-border bg-muted/25 px-6 text-center">
            <p className="text-sm font-medium text-foreground">
              Pré-visualização da apresentação
            </p>
            <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
              Adicione imagens, vídeos ou URLs do YouTube neste formulário para ver o
              carrossel aqui.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="galeria" className="mt-4 outline-none">
          <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-4 py-10 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              Sem miniaturas — envie ficheiros multimídia ou defina vídeos do
              YouTube neste formulário para preencher a grelha.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    );
  }

  const currentSlide = currentSlidePreview;

  const go = (dir) => {
    setSlideIndex((i) => {
      const n = slides.length;
      if (dir < 0) return (i - 1 + n) % n;
      return (i + 1) % n;
    });
  };

  const lightboxSafe =
    lightboxIndex != null
      ? Math.min(lightboxIndex, slides.length - 1)
      : 0;
  const lightSlide = slides[lightboxSafe];

  const openPresentationFullscreen = (idx) => {
    const fn = onFullscreenButton ?? onSlideImageActivate;
    if (!fn) return;
    setLightboxIndex(null);
    window.requestAnimationFrame(() => fn(idx));
  };

  const stepLightbox = (dir) => {
    setLightboxIndex((cur) => {
      if (cur == null) return cur;
      const n = slides.length;
      if (dir < 0) return (cur - 1 + n) % n;
      return (cur + 1) % n;
    });
  };

  const handleGalleryImagesDragEnd = (result) => {
    if (!adminGallery?.onReorderAnexos) return;
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;
    const next = reorderVisualAttachmentsInAnexos(
      adminGallery.anexos,
      source.index,
      destination.index,
    );
    adminGallery.onReorderAnexos(next);
  };

  const galleryDragEnabled =
    !!adminGallery?.onReorderAnexos && slides.length > 1;

  const draggableIdForSlide = (slide, i) => {
    if (slide.kind === "youtube")
      return `gal-yt-${slide.videoId}-${i}`;
    return `gal-${String(slide.url || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200)}-${i}`;
  };

  return (
    <>
      <Tabs
        value={galleryOnly ? "galeria" : activeTab}
        onValueChange={galleryOnly ? () => {} : setActiveTab}
        className="w-full"
      >
        <div className="flex flex-wrap items-center gap-2 sm:justify-between sm:gap-3">
          {!galleryOnly ? (
            <TabsList className="grid h-auto min-h-10 min-w-0 flex-1 grid-cols-2 rounded-xl p-1 sm:inline-flex sm:w-auto sm:flex-initial">
              <TabsTrigger
                value="apresentacao"
                className="rounded-lg px-4 py-2 text-sm font-medium"
              >
                Apresentação
              </TabsTrigger>
              <TabsTrigger
                value="galeria"
                className="rounded-lg px-4 py-2 text-sm font-medium"
              >
                Galeria
              </TabsTrigger>
            </TabsList>
          ) : null}
          {adminGallery?.onSave &&
          Array.isArray(adminGallery.anexos) &&
          adminGallery.anexos.length > 0 ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                disabled={
                  !!adminGallery.saveDisabled || !!adminGallery.saving
                }
                onClick={() => adminGallery.onSave?.()}
              >
                {adminGallery.saving ? "A guardar…" : "Salvar"}
              </Button>
              {adminGallery.saveError ? (
                <p
                  className="max-w-[min(100%,16rem)] truncate text-sm text-destructive sm:max-w-xs"
                  title={adminGallery.saveError}
                >
                  {adminGallery.saveError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {!galleryOnly ? (
        <TabsContent value="apresentacao" className="mt-4 space-y-4 outline-none">
          {String(audioAmbienteUrl || "").trim() &&
          audioAmbienteAtivo !== false ? (
            <audio
              ref={audioRef}
              className="sr-only"
              preload="metadata"
              aria-hidden="true"
            />
          ) : null}
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black/5">
            {currentSlide.kind === "image" ? (
              <SafeImg
                src={currentSlide.url}
                alt=""
                className={`h-full w-full object-contain bg-black/80 ${onSlideImageActivate ? "cursor-zoom-in" : ""}`}
                onClick={
                  onSlideImageActivate
                    ? () => onSlideImageActivate(safeIndex)
                    : undefined
                }
              />
            ) : currentSlide.kind === "video" ? (
              <video
                key={currentSlide.url ?? `slide-${safeIndex}`}
                src={currentSlide.url}
                muted
                playsInline
                preload="metadata"
                controls
                className="h-full w-full object-contain bg-black"
                onEnded={advanceCarousel}
                onVolumeChange={onFileVideoVolumeChange}
              />
            ) : (
              <div
                id={youtubePresentationDomId}
                role="region"
                aria-label="YouTube"
                className="h-full min-h-[200px] w-full bg-black"
              />
            )}
            {showMediaKindBadge ? (
              <MediaKindCornerBadge
                kind={slideGalleryBadgeKind(currentSlide)}
                variant="onDark"
                className={
                  slides.length > 1
                    ? "bottom-10 left-3 sm:bottom-11"
                    : "bottom-3 left-3"
                }
              />
            ) : null}
            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Anterior"
                  className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 shadow transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Seguinte"
                  className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 shadow transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => go(1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === safeIndex
                          ? "w-6 bg-accent"
                          : "w-2 bg-background/70"
                      }`}
                      onClick={() => setSlideIndex(i)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {showFullscreenEntry && onFullscreenButton ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => onFullscreenButton(safeIndex)}
              >
                <Maximize2 className="h-4 w-4 shrink-0" aria-hidden />
                Ver em tela cheia
              </Button>
            ) : null}
          </div>
          {slides.length > 1 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Tempo entre slides (imagens): {delaySec}s — vídeos no carrossel
                  ficam mudos por defeito (a música de fundo continua); ao ligar o
                  som do vídeo, a música pausa até mudar de slide ou silenciar o
                  vídeo.
                </span>
              </div>
              <Slider
                value={[delaySec]}
                onValueChange={(v) => setDelaySec(v[0])}
                min={2}
                max={20}
                step={1}
                className="flex-1"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Um único slide — sem rotação automática.
            </p>
          )}
        </TabsContent>
        ) : null}

        <TabsContent
          value="galeria"
          className={cn("outline-none", galleryOnly ? "mt-0" : "mt-4")}
        >
          {galleryDragEnabled ? (
            <DragDropContext onDragEnd={handleGalleryImagesDragEnd}>
              <Droppable
                droppableId="post-gallery-thumbnails"
                direction="horizontal"
              >
                {(dropProvided) => (
                  <div
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    className="flex flex-nowrap gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]"
                  >
                    {slides.map((slide, i) => (
                      <Draggable
                        key={draggableIdForSlide(slide, i)}
                        draggableId={draggableIdForSlide(slide, i)}
                        index={i}
                      >
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-muted/30 outline-none transition-[box-shadow,ring,opacity] sm:h-28 sm:w-28 md:h-32 md:w-32 ${
                              snapshot.isDragging
                                ? "z-10 opacity-90 shadow-lg ring-2 ring-accent"
                                : ""
                            } ${
                              i === safeIndex
                                ? "ring-2 ring-accent shadow-md"
                                : "border-border"
                            }`}
                          >
                            <button
                              type="button"
                              className="absolute left-1 top-1 z-20 flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md border border-border bg-background/95 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground active:cursor-grabbing"
                              {...dragProvided.dragHandleProps}
                              aria-label={`Arrastar slide ${i + 1}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-4 w-4 shrink-0" />
                            </button>
                            {(slide.kind === "image" || slide.kind === "video") &&
                            slide.url ? (
                              <GalleryFeaturedStar
                                src={slide.url}
                                starCtl={starCtl}
                                defaultThumbUrl={defaultListThumbUrl}
                              />
                            ) : null}
                            <button
                              type="button"
                              className="absolute inset-0 z-10 overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => {
                                setSlideIndex(i);
                                setLightboxIndex(i);
                              }}
                              aria-label={`Abrir slide ${i + 1}`}
                            >
                              {slide.kind === "image" ? (
                                <SafeImg
                                  src={slide.url}
                                  alt=""
                                  className="pointer-events-none h-full w-full object-cover"
                                />
                              ) : slide.kind === "video" ? (
                                <video
                                  src={slide.url}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="pointer-events-none h-full w-full object-cover"
                                />
                              ) : (
                                <SafeImg
                                  src={slideThumbSrc(slide)}
                                  alt=""
                                  className="pointer-events-none h-full w-full object-cover"
                                />
                              )}
                            </button>
                            {showMediaKindBadge ? (
                              <MediaKindCornerBadge
                                kind={slideGalleryBadgeKind(slide)}
                              />
                            ) : null}
                            <GallerySlideRemoveButton
                              slideIndex={i}
                              onRemoveGallerySlide={onRemoveGallerySlide}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {dropProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {slides.map((slide, i) =>
                starCtl ? (
                  <div
                    key={draggableIdForSlide(slide, i)}
                    className={`relative aspect-square overflow-hidden rounded-xl border bg-muted/30 transition-[box-shadow,ring] ${
                      i === safeIndex
                        ? "ring-2 ring-accent shadow-md"
                        : "border-border"
                    }`}
                  >
                    {(slide.kind === "image" || slide.kind === "video") &&
                    slide.url ? (
                      <GalleryFeaturedStar
                        src={slide.url}
                        starCtl={starCtl}
                        defaultThumbUrl={defaultListThumbUrl}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="absolute inset-0 z-10 overflow-hidden rounded-[inherit] hover:ring-2 hover:ring-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setSlideIndex(i);
                        setLightboxIndex(i);
                      }}
                      aria-label={`Abrir slide ${i + 1}`}
                    >
                      {slide.kind === "image" ? (
                        <SafeImg
                          src={slide.url}
                          alt=""
                          className="pointer-events-none h-full w-full object-cover"
                        />
                      ) : slide.kind === "video" ? (
                        <video
                          src={slide.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="pointer-events-none h-full w-full object-cover"
                        />
                      ) : (
                        <SafeImg
                          src={slideThumbSrc(slide)}
                          alt=""
                          className="pointer-events-none h-full w-full object-cover"
                        />
                      )}
                    </button>
                    {showMediaKindBadge ? (
                      <MediaKindCornerBadge
                        kind={slideGalleryBadgeKind(slide)}
                      />
                    ) : null}
                    <GallerySlideRemoveButton
                      slideIndex={i}
                      onRemoveGallerySlide={onRemoveGallerySlide}
                    />
                  </div>
                ) : (
                  <div
                    key={draggableIdForSlide(slide, i)}
                    className={`relative aspect-square overflow-hidden rounded-xl border bg-muted/30 transition-[box-shadow,ring] ${
                      i === safeIndex
                        ? "ring-2 ring-accent shadow-md"
                        : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      className="absolute inset-0 overflow-hidden hover:ring-2 hover:ring-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setSlideIndex(i);
                        setLightboxIndex(i);
                      }}
                      aria-label={`Abrir slide ${i + 1}`}
                    >
                      {slide.kind === "image" ? (
                        <SafeImg
                          src={slide.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : slide.kind === "video" ? (
                        <video
                          src={slide.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <SafeImg
                          src={slideThumbSrc(slide)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                    {showMediaKindBadge ? (
                      <MediaKindCornerBadge
                        kind={slideGalleryBadgeKind(slide)}
                      />
                    ) : null}
                    <GallerySlideRemoveButton
                      slideIndex={i}
                      onRemoveGallerySlide={onRemoveGallerySlide}
                    />
                  </div>
                ),
              )}
            </div>
          )}

          {galleryDragEnabled || starCtl ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {galleryDragEnabled
                ? "Ordem da esquerda para a direita. Arraste pelo ícone ⋮⋮; clique para ampliar."
                : null}
              {galleryDragEnabled && starCtl ? " " : null}
              {starCtl
                ? "Estrela: miniatura na lista (foto ou vídeo). Sem estrela, usa a 1.ª imagem; vídeo só com estrela."
                : null}
            </p>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null);
        }}
      >
        <DialogContent
          hideClose
          className="max-h-[90vh] max-w-[min(96vw,56rem)] gap-0 overflow-hidden border bg-background p-0 shadow-xl sm:rounded-xl"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            Pré-visualização
            {lightSlide ? ` — ${getSlideCaptionLabel(lightSlide)}` : ""}
          </DialogTitle>
          <div className="relative flex max-h-[85vh] min-h-[200px] items-center justify-center bg-black/95">
            <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
              {canOpenFullscreen ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-sm hover:bg-black/70"
                  aria-label="Ver em tela cheia"
                  onClick={() => openPresentationFullscreen(lightboxSafe)}
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-sm hover:bg-black/70"
                aria-label="Fechar"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>

            <div className="relative flex w-full max-w-full items-center justify-center">
              {lightSlide.kind === "image" ? (
                <SafeImg
                  src={lightSlide.url}
                  alt={getSlideCaptionLabel(lightSlide)}
                  className="max-h-[85vh] w-full object-contain"
                />
              ) : lightSlide.kind === "video" ? (
                <video
                  src={lightSlide.url}
                  muted
                  playsInline
                  preload="metadata"
                  controls
                  className="max-h-[85vh] w-full object-contain"
                />
              ) : (
                <iframe
                  title={getSlideCaptionLabel(lightSlide) || "YouTube"}
                  src={`https://www.youtube-nocookie.com/embed/${lightSlide.videoId}?rel=0`}
                  className="aspect-video max-h-[85vh] min-h-[200px] w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
              <SlideMediaCaption slide={lightSlide} />
            </div>
            {showMediaKindBadge ? (
              <MediaKindCornerBadge
                kind={slideGalleryBadgeKind(lightSlide)}
                variant="onDark"
              />
            ) : null}

            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Slide anterior"
                  className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                  onClick={() => stepLightbox(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Slide seguinte"
                  className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                  onClick={() => stepLightbox(1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

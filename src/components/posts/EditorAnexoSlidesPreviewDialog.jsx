import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import SafeImg from "@/components/shared/SafeImg";
import SlideMediaCaption from "@/components/posts/SlideMediaCaption";
import { getSlideCaptionLabel } from "@/lib/posts";

/**
 * Botão para abrir pré-visualização (não inicia arrasto).
 */
export function AnexoPreviewOpenButton({
  onClick,
  className = "",
  size = "md",
  label = "Ver em tamanho maior",
}) {
  const box = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button
      type="button"
      className={`flex cursor-pointer items-center justify-center rounded-md border border-border bg-background/95 text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${box} ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={label}
    >
      <Maximize2 className={icon} aria-hidden />
    </button>
  );
}

/**
 * Modal de visualização de anexos (imagem ou vídeo) no editor de postagens.
 */
export default function EditorAnexoSlidesPreviewDialog({
  slides = [],
  previewIndex,
  onPreviewIndexChange,
}) {
  const open = previewIndex != null && previewIndex >= 0;
  const safeIndex =
    open && slides.length
      ? Math.min(previewIndex, slides.length - 1)
      : 0;
  const slide = open ? slides[safeIndex] : null;

  const close = () => onPreviewIndexChange?.(null);
  const step = (dir) => {
    if (!slides.length) return;
    onPreviewIndexChange?.((cur) => {
      if (cur == null) return cur;
      const n = slides.length;
      if (dir < 0) return (cur - 1 + n) % n;
      return (cur + 1) % n;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent
        hideClose
        className="max-h-[90vh] max-w-[min(96vw,56rem)] gap-0 overflow-hidden border bg-background p-0 shadow-xl sm:rounded-xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          Pré-visualização
          {slide ? ` — ${getSlideCaptionLabel(slide)}` : ""}
        </DialogTitle>
        <div className="relative flex max-h-[85vh] min-h-[200px] items-center justify-center bg-black/95">
          <div className="absolute right-2 top-2 z-20">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-sm hover:bg-black/70"
              aria-label="Fechar"
              onClick={close}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>

          {slide ? (
            <div className="relative flex w-full max-w-full items-center justify-center">
              {slide.kind === "image" ? (
                <SafeImg
                  src={slide.url}
                  alt={getSlideCaptionLabel(slide)}
                  className="max-h-[85vh] w-full object-contain"
                />
              ) : slide.kind === "video" ? (
                <video
                  src={slide.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[85vh] w-full object-contain"
                />
              ) : null}
              <SlideMediaCaption slide={slide} />
            </div>
          ) : null}

          {slides.length > 1 && open ? (
            <>
              <button
                type="button"
                aria-label="Anterior"
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                onClick={() => step(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Seguinte"
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
                onClick={() => step(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

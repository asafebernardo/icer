import { memo } from "react";

import HistoryImage from "@/components/historia/history/HistoryImage";
import type { TimelineImage } from "@/components/historia/history/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface HistoryImageLightboxProps {
  image: TimelineImage | null;
  caption?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function HistoryImageLightbox({
  image,
  caption,
  open,
  onOpenChange,
}: HistoryImageLightboxProps) {
  if (!image) return null;

  const label = caption ?? image.alt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[min(96vh,900px)] w-[calc(100%-1rem)] max-w-5xl gap-0 overflow-hidden p-0",
          "border-border bg-card sm:w-[calc(100%-2rem)]",
        )}
        aria-describedby={label ? "historia-lightbox-caption" : undefined}
      >
        <DialogTitle className="sr-only">{image.alt || "Imagem ampliada"}</DialogTitle>

        <div className="flex max-h-[min(96vh,900px)] flex-col">
          <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-3 sm:p-5">
            <HistoryImage
              src={image.src}
              alt={image.alt}
              priority
              className="w-full"
              imgClassName="mx-auto max-h-[min(82vh,780px)] w-full object-contain"
            />
          </div>
          {label ? (
            <p
              id="historia-lightbox-caption"
              className="shrink-0 border-t border-border px-4 py-3 text-center text-sm leading-relaxed text-muted-foreground sm:px-6 sm:py-4"
            >
              {label}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(HistoryImageLightbox);

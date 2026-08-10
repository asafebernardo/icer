import { memo } from "react";
import { motion } from "framer-motion";

import type { TimelineImage } from "@/components/historia/history/types";
import HistoryImage from "@/components/historia/history/HistoryImage";
import { cn } from "@/lib/utils";

interface HistoryGalleryProps {
  images: TimelineImage[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function HistoryGallery({ images, activeIndex, onSelect }: HistoryGalleryProps) {
  if (images.length <= 1) return null;

  return (
    <div role="group" aria-label="Galeria de imagens do evento">
      <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Galeria
      </p>
      <div className="flex justify-center gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible sm:pb-0">
        {images.map((img, index) => {
          const isActive = index === activeIndex;
          return (
            <motion.button
              key={img.src}
              type="button"
              aria-label={img.alt}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelect(index)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                opacity: isActive ? 1 : 0.55,
              }}
              transition={{ duration: 0.25 }}
              className={cn(
                "relative h-[64px] w-[76px] shrink-0 overflow-hidden rounded-xl border bg-muted sm:h-[72px] sm:w-[88px]",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.2),0_4px_16px_hsl(var(--primary)/0.1)]"
                  : "border-border hover:border-border/80 hover:opacity-90",
              )}
            >
              <HistoryImage
                src={img.src}
                alt=""
                imgClassName="p-1"
                className="h-full w-full"
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(HistoryGallery);

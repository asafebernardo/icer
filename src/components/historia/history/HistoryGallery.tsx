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
    <div
      className="mt-6"
      role="group"
      aria-label="Galeria de imagens do evento"
    >
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#64748B]">
        Galeria
      </p>
      <div className="flex flex-wrap gap-2.5">
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
                "relative h-[72px] w-[88px] overflow-hidden rounded-xl border bg-[#0B0B0F]",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/45",
                isActive
                  ? "border-[#3B82F6]/60 shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_4px_16px_rgba(59,130,246,0.1)]"
                  : "border-white/[0.08] hover:border-white/[0.16] hover:opacity-90",
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

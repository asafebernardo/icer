import { memo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import HistoryGallery from "@/components/historia/history/HistoryGallery";
import HistoryImage from "@/components/historia/history/HistoryImage";
import HistoryNavigation from "@/components/historia/history/HistoryNavigation";
import {
  CATEGORY_COLORS,
  formatEventYear,
  type TimelineEvent,
} from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

interface HistoryDetailsProps {
  event: TimelineEvent;
  imageIndex: number;
  onImageIndexChange: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  current: number;
  total: number;
  className?: string;
}

const contentVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const imageVariants = {
  initial: { opacity: 0, scale: 0.992 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.996 },
};

function getImageCaption(image: TimelineEvent["images"][number] | undefined) {
  if (!image) return null;
  const text = (image.caption ?? image.alt)?.trim();
  return text || null;
}

function HistoryDetails({
  event,
  imageIndex,
  onImageIndexChange,
  onPrev,
  onNext,
  canPrev,
  canNext,
  current,
  total,
  className,
}: HistoryDetailsProps) {
  const colors = CATEGORY_COLORS[event.category];
  const activeImage = event.images[imageIndex] ?? event.images[0];
  const caption = getImageCaption(activeImage);
  const paragraphs = event.content.split(/\n\n+/).filter(Boolean);

  useEffect(() => {
    const next = event.images[imageIndex + 1] ?? event.images[0];
    if (!next?.src) return undefined;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = next.src;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [event.id, imageIndex, event.images]);

  return (
    <article
      className={cn(
        "rounded-[28px] border border-white/[0.06] bg-[#12141A]/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10 lg:p-12",
        className,
      )}
      aria-labelledby="history-detail-title"
    >
      <AnimatePresence mode="wait">
        <motion.header
          key={`header-${event.id}`}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={contentVariants}
          transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
          className="mb-8 border-b border-white/[0.05] pb-8"
        >
          <time
            dateTime={event.yearLabel ? undefined : String(event.year)}
            className="font-display text-5xl font-bold tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.5rem] lg:leading-none"
          >
            {formatEventYear(event)}
          </time>
          <h2
            id="history-detail-title"
            className="mt-3 font-display text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-[#F1F5F9] sm:text-3xl lg:text-[2.625rem]"
          >
            {event.title}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: colors.accent, backgroundColor: colors.bg }}
            >
              {event.category}
            </span>
            {event.location ? (
              <span className="text-sm text-[#64748B]">{event.location}</span>
            ) : null}
          </div>
          {event.summary ? (
            <p className="mt-5 text-base leading-relaxed text-[#94A3B8] sm:text-lg">
              {event.summary}
            </p>
          ) : null}
        </motion.header>
      </AnimatePresence>

      <div className="mx-auto max-w-4xl">
        {activeImage ? (
          <AnimatePresence mode="wait">
            <motion.figure
              key={`${event.id}-${imageIndex}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={imageVariants}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="mb-10"
            >
              <div className="relative w-full overflow-hidden rounded-[22px] border border-white/[0.05] bg-[#0B0B0F]/60">
                <HistoryImage
                  src={activeImage.src}
                  alt={activeImage.alt}
                  priority
                  fill
                  className="min-h-[280px] w-full p-4 sm:min-h-[400px] sm:p-6 lg:min-h-[520px] lg:p-8"
                  imgClassName="h-auto w-full max-h-[min(75vh,820px)] object-contain"
                />
              </div>

              {caption ? (
                <figcaption className="mt-4 text-center text-sm leading-relaxed text-[#94A3B8] sm:text-[15px]">
                  {caption}
                </figcaption>
              ) : null}

              <HistoryGallery
                images={event.images}
                activeIndex={imageIndex}
                onSelect={onImageIndexChange}
              />
            </motion.figure>
          </AnimatePresence>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${event.id}`}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
            transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="space-y-5">
              {paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-[17px] leading-[1.85] text-[#B8B8B8] sm:text-lg"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {event.references?.length ? (
              <div className="mt-10 border-t border-white/[0.05] pt-8">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#64748B]">
                  Referências
                </p>
                <ul className="space-y-2 text-sm leading-relaxed text-[#94A3B8]">
                  {event.references.map((ref) => (
                    <li key={ref}>{ref}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <HistoryNavigation
        onPrev={onPrev}
        onNext={onNext}
        canPrev={canPrev}
        canNext={canNext}
        current={current}
        total={total}
        className="mt-12"
      />
    </article>
  );
}

export default memo(HistoryDetails);

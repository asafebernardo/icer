import { memo } from "react";
import { motion } from "framer-motion";

import {
  CATEGORY_COLORS,
  formatEventYear,
  type TimelineEvent,
} from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

interface TimelineCardProps {
  event: TimelineEvent;
  isActive: boolean;
  onSelect: () => void;
}

function TimelineCard({ event, isActive, onSelect }: TimelineCardProps) {
  const colors = CATEGORY_COLORS[event.category];
  const yearLabel = formatEventYear(event);

  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-label={`${yearLabel} — ${event.category} — ${event.title}`}
      onClick={onSelect}
      initial={false}
      animate={{
        scale: isActive ? 1.04 : 1,
        opacity: isActive ? 1 : 0.62,
        y: 0,
      }}
      whileHover={
        isActive ? { y: -2 } : { scale: 1.03, y: -3 }
      }
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "flex w-[168px] shrink-0 flex-col items-center gap-3 rounded-2xl border px-4 py-4 text-center",
        "bg-[#14161B] shadow-[0_8px_32px_rgba(0,0,0,0.28)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0F]",
        isActive
          ? "border-[#3B82F6]/55 shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_12px_40px_rgba(59,130,246,0.12)]"
          : "border-white/[0.07] hover:border-white/[0.14] hover:opacity-90",
      )}
    >
      <time
        dateTime={event.yearLabel ? undefined : String(event.year)}
        className={cn(
          "font-display text-2xl font-bold tabular-nums tracking-tight",
          isActive ? "text-[#F8FAFC]" : "text-[#94A3B8]",
        )}
      >
        {yearLabel}
      </time>

      <span
        className={cn(
          "inline-flex w-fit rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]",
          isActive && "ring-1 ring-inset shadow-sm",
        )}
        style={{
          color: colors.accent,
          backgroundColor: colors.bg,
          ...(isActive
            ? {
                boxShadow: `0 0 20px -6px ${colors.glow}`,
                borderColor: `${colors.accent}55`,
              }
            : {}),
        }}
      >
        {event.category}
      </span>
    </motion.button>
  );
}

export default memo(TimelineCard);

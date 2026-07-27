import { memo } from "react";
import { motion } from "framer-motion";

import {
  CATEGORY_COLORS,
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

  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-label={`${event.title} — ${event.category}`}
      onClick={onSelect}
      initial={false}
      animate={{
        scale: isActive ? 1.02 : 1,
        opacity: isActive ? 1 : 0.55,
        y: 0,
      }}
      whileHover={
        isActive ? { y: -2 } : { scale: 1.02, y: -4 }
      }
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "flex w-[200px] shrink-0 flex-col items-center gap-2 rounded-[14px] border px-4 py-3.5 text-center",
        "bg-[#14161B] shadow-[0_8px_32px_rgba(0,0,0,0.28)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0F]",
        isActive
          ? "border-[#3B82F6]/55 shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_12px_40px_rgba(59,130,246,0.12)]"
          : "border-white/[0.07] hover:border-white/[0.14] hover:opacity-80",
      )}
    >
      <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug text-[#CBD5E1]">
        {event.title}
      </h3>

      <span
        className="inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: colors.accent, backgroundColor: colors.bg }}
      >
        {event.category}
      </span>
    </motion.button>
  );
}

export default memo(TimelineCard);

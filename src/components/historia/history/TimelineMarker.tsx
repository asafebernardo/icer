import { memo } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface TimelineMarkerProps {
  isActive: boolean;
  isPast: boolean;
  onClick: () => void;
  label: string;
}

function TimelineMarker({ isActive, isPast, onClick, label }: TimelineMarkerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "relative z-[2] flex h-6 w-6 shrink-0 items-center justify-center outline-none",
        "focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0F]",
      )}
    >
      {isActive ? (
        <motion.span
          layoutId="history-active-marker-glow"
          className="absolute inset-0 rounded-full bg-[#3B82F6]/20 blur-[6px]"
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        />
      ) : null}
      <motion.span
        layout
        animate={{
          width: isActive ? 12 : isPast ? 8 : 6,
          height: isActive ? 12 : isPast ? 8 : 6,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={cn(
          "relative rounded-full border",
          isActive
            ? "border-[#3B82F6] bg-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.35)]"
            : isPast
              ? "border-[#3B82F6]/40 bg-[#3B82F6]/25"
              : "border-white/15 bg-[#14161B]",
        )}
      />
    </button>
  );
}

export default memo(TimelineMarker);

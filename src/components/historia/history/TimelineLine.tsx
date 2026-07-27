import { memo } from "react";
import { motion } from "framer-motion";

interface TimelineLineProps {
  activeIndex: number;
  total: number;
  className?: string;
}

function TimelineLine({ activeIndex, total, className }: TimelineLineProps) {
  const fillPercent =
    total <= 1 ? 100 : (activeIndex / (total - 1)) * 100;

  return (
    <div className={className} aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.06]" />
      <motion.div
        className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-[#3B82F6]/40 via-[#3B82F6]/90 to-[#60A5FA]/80"
        initial={false}
        animate={{ width: `${fillPercent}%` }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}

export default memo(TimelineLine);

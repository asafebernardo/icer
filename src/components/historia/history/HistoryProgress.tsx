import { memo } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface HistoryProgressProps {
  current: number;
  total: number;
  className?: string;
}

function HistoryProgress({ current, total, className }: HistoryProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div
      className={cn("mb-5", className)}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Progresso: evento ${current} de ${total}`}
    >
      <div className="mx-auto h-px max-w-lg overflow-hidden bg-white/[0.05]">
        <motion.div
          className="h-full bg-gradient-to-r from-[#3B82F6]/30 via-[#3B82F6]/70 to-[#60A5FA]/50"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

export default memo(HistoryProgress);

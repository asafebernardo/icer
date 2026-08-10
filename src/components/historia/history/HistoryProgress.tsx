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
      <div className="mx-auto h-px max-w-lg overflow-hidden bg-border">
        <motion.div
          className="h-full bg-gradient-to-r from-primary/30 via-primary/70 to-primary/50"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

export default memo(HistoryProgress);

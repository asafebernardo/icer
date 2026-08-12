import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * @param {{ href?: string, className?: string, light?: boolean }} props
 */
export default function ComoChegarButton({ href, className, light = false }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors",
        light
          ? "bg-background text-foreground hover:bg-background/90"
          : "bg-primary text-primary-foreground hover:bg-primary-hover",
        className,
      )}
    >
      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
      Como chegar
    </a>
  );
}

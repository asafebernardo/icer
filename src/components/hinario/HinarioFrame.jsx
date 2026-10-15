import { cn } from "@/lib/utils";

/** Coluna estreita, ao estilo de um app de hinário no telemóvel. */
export default function HinarioFrame({ children, className }) {
  return (
    <div className="min-h-full bg-background">
      <div
        className={cn(
          "mx-auto flex w-full max-w-md flex-col sm:my-6 sm:overflow-hidden sm:rounded-3xl sm:border sm:border-border sm:bg-card sm:shadow-sm",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

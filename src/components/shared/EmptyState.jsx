import { Inbox } from "lucide-react";

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action = null,
  compact = false,
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center py-8 px-4 text-center"
          : "flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center"
      }
    >
      <div
        className={
          compact
            ? "w-14 h-14 rounded-xl bg-muted/80 border border-border/60 shadow-soft flex items-center justify-center mb-3"
            : "w-20 h-20 rounded-2xl bg-muted/80 border border-border/60 shadow-soft flex items-center justify-center mb-5"
        }
      >
        <Icon
          className={
            compact
              ? "w-6 h-6 text-muted-foreground"
              : "w-9 h-9 text-muted-foreground"
          }
          strokeWidth={1.5}
        />
      </div>
      {title ? (
        <h3
          className={
            compact
              ? "text-base font-semibold text-foreground mb-1 max-w-md text-balance"
              : "text-xl font-semibold text-foreground mb-3 max-w-md text-balance"
          }
        >
          {title}
        </h3>
      ) : null}
      {description ? (
        <p
          className={
            compact
              ? "text-sm text-muted-foreground max-w-md leading-relaxed"
              : "text-base text-muted-foreground max-w-md leading-relaxed"
          }
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

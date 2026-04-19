import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-muted/80 border border-border/60 shadow-soft flex items-center justify-center mb-5">
        <Icon className="w-9 h-9 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3 max-w-md text-balance">
        {title}
      </h3>
      <p className="text-base text-muted-foreground max-w-md leading-relaxed">
        {description}
      </p>
    </div>
  );
}

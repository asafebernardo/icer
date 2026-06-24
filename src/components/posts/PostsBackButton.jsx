import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PostsBackButton({
  to,
  label = "Voltar",
  className,
}) {
  if (!to) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 shrink-0 gap-1.5 px-2 text-[#94A3B8] hover:text-[#F8FAFC]",
        className,
      )}
      asChild
    >
      <Link to={to}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {label}
      </Link>
    </Button>
  );
}

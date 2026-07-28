import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Ações admin / filtros na página de posts (Novo …). */
export default function PostsAdminToolbar({
  canCreate,
  createHref = "/Eventos/nova",
  createLabel = "Novo post",
  needsEditMode = false,
  compact = false,
  start = null,
  end = null,
  className,
}) {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;
  const visible = canCreate || needsEditMode || Boolean(start) || Boolean(end);
  if (!visible) return null;

  if (compact) {
    if (needsEditMode) {
      return (
        <p className="max-w-[10.5rem] text-right text-[10px] leading-snug text-[#64748B] sm:max-w-none sm:text-xs">
          Ative o{" "}
          <span className="font-medium text-[#94A3B8]">modo edição</span>
        </p>
      );
    }
    return canCreate ? (
      <Button size="sm" className="h-8 px-3 text-xs" asChild>
        <Link to={createHref} state={{ from: returnPath }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {createLabel}
        </Link>
      </Button>
    ) : null;
  }

  return (
    <div
      className={cn(
        "posts-admin-toolbar flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-white/[0.06] px-3 py-2.5 sm:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {start}
        {needsEditMode ? (
          <p className="text-xs text-[#64748B]">
            Ative o{" "}
            <span className="font-medium text-[#94A3B8]">modo edição</span> no
            menu para criar ou editar posts.
          </p>
        ) : null}
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        {end}
        {canCreate ? (
          <Button size="sm" className="h-8 px-3 text-xs" asChild>
            <Link to={createHref} state={{ from: returnPath }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {createLabel}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

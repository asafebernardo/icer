import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Ações admin na página de uma categoria de posts (Novo …). */
export default function PostsAdminToolbar({
  canCreate,
  createHref = "/Eventos/nova",
  createLabel = "Novo post",
  needsEditMode = false,
  compact = false,
  className,
}) {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;
  const visible = canCreate || needsEditMode;
  if (!visible) return null;

  if (compact) {
    if (needsEditMode) return null;
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
      {needsEditMode ? (
        <p className="text-xs text-[#64748B]">
          Ative o{" "}
          <span className="font-medium text-[#94A3B8]">modo edição</span> no menu
          para criar ou editar posts.
        </p>
      ) : (
        <span className="hidden sm:block" aria-hidden />
      )}

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
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

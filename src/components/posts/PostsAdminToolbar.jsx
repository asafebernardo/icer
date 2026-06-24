import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Ações admin na página de uma categoria de posts (Novo post). */
export default function PostsAdminToolbar({
  canCreate,
  createHref = "/Posts/nova",
  needsEditMode = false,
  className,
}) {
  const visible = canCreate || needsEditMode;
  if (!visible) return null;

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
            <Link to={createHref}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo post
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

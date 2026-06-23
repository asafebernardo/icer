import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Ações admin na página de posts (Novo, Rascunhos). */
export default function PostsAdminToolbar({
  canCreate,
  canShowDrafts,
  showDrafts,
  onToggleDrafts,
  needsEditMode = false,
  className,
}) {
  const visible = canCreate || canShowDrafts || needsEditMode;
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
        {canShowDrafts ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 border-white/[0.08] bg-[#08111F]/50 px-3 text-xs text-[#94A3B8]",
              showDrafts && "border-[#38BDF8]/25 bg-[#38BDF8]/10 text-[#F8FAFC]",
            )}
            aria-pressed={showDrafts}
            onClick={onToggleDrafts}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Rascunhos
          </Button>
        ) : null}
        {canCreate ? (
          <Button size="sm" className="h-8 px-3 text-xs" asChild>
            <Link to="/Posts/nova">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo post
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { CalendarDays, X } from "lucide-react";

import Agenda from "@/pages/Agenda";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const overlayShellClass = cn(
  "gap-0 overflow-hidden border-border/60 p-0 flex h-full max-h-full min-h-0 flex-col",
  "max-sm:fixed max-sm:inset-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0",
  "sm:max-h-[96vh] sm:w-[calc(100vw-1rem)] sm:max-w-6xl sm:overflow-y-auto sm:rounded-xl sm:border sm:p-0",
);

export default function AgendaFloatingFab() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openAgenda = () => setOpen(true);
    window.addEventListener("icer-open-agenda", openAgenda);
    return () => window.removeEventListener("icer-open-agenda", openAgenda);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir agenda"
        title="Agenda"
        className={cn(
          "fixed z-40 inline-flex h-14 w-14 items-center justify-center rounded-full",
          "bg-accent text-accent-foreground shadow-xl ring-1 ring-black/10",
          "transition-transform duration-200 hover:scale-105 active:scale-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-4 sm:bottom-6 sm:left-6",
        )}
      >
        <CalendarDays className="h-7 w-7" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          className={overlayShellClass}
        >
          <DialogTitle className="sr-only">Agenda</DialogTitle>
          <DialogDescription className="sr-only">
            Calendário mensal de cultos, estudos e encontros.
          </DialogDescription>

          <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background px-3 py-2 sm:px-4">
            <p className="text-sm font-semibold text-foreground sm:text-base">
              Agenda
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Fechar agenda"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Agenda embedded onClose={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

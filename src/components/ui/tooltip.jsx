"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

/** Tempo até o conteúdo do tooltip Radix fechar sozinho após abrir (ms). */
export const TOOLTIP_HIDE_AFTER_MS = 3000;

const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Tooltip com fecho automático após {@link TOOLTIP_HIDE_AFTER_MS}.
 * Use `hideAfterMs={0}` para manter o comportamento padrão (só fecha ao sair do trigger).
 */
function Tooltip({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  hideAfterMs = TOOLTIP_HIDE_AFTER_MS,
  ...props
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const handleOpenChange = React.useCallback(
    (next) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  React.useEffect(() => {
    if (!open || hideAfterMs <= 0) return undefined;
    const id = window.setTimeout(() => handleOpenChange(false), hideAfterMs);
    return () => window.clearTimeout(id);
  }, [open, hideAfterMs, handleOpenChange]);

  return (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      {...props}
    >
      {children}
    </TooltipPrimitive.Root>
  );
}

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

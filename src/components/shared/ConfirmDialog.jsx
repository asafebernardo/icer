import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Modal de confirmação (substitui `window.confirm`).
 * @param {boolean} open
 * @param {(open: boolean) => void} onOpenChange
 * @param {string} title
 * @param {string} [description]
 * @param {string} [confirmLabel]
 * @param {string} [cancelLabel]
 * @param {() => void} onConfirm — chamado ao confirmar (o diálogo fecha em seguida)
 * @param {"danger" | "default"} [confirmVariant] — estilo do botão de confirmação
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  confirmVariant = "danger",
}) {
  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn("z-[100] max-w-[min(calc(100vw-2rem),28rem)]")}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">{cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant={confirmVariant === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

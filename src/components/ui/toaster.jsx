import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  const visible = toasts.filter((t) => t.open !== false);

  return (
    <ToastProvider>
      {visible.map(function ({
        id,
        title,
        description,
        action,
        onOpenChange: _onOpenChange,
        open: _open,
        ...props
      }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose
              type="button"
              aria-label="Fechar"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismiss(id);
              }}
            />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

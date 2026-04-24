import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Campo de palavra-passe com botão para mostrar ou ocultar o texto.
 * Repassa as restantes props para `Input` (exceto `type`).
 */
export default function PasswordRevealInput({
  id: idProp,
  className = "",
  disabled,
  ...inputProps
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        disabled={disabled}
        className={`pr-11 ${className}`.trim()}
        {...inputProps}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
      >
        {show ? (
          <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </button>
    </div>
  );
}

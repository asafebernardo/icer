import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export const MSG_CAMPO_OBRIGATORIO = "Este campo é obrigatório.";

/** Mensagem de validação com entrada/saída suaves (opacity + deslocamento). */
export function FieldHintMessage({ message, className }) {
  const [display, setDisplay] = useState(message ?? "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setDisplay(message);
      setVisible(false);
      let innerId;
      const outerId = requestAnimationFrame(() => {
        innerId = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outerId);
        if (innerId != null) cancelAnimationFrame(innerId);
      };
    }
    setVisible(false);
    const t = window.setTimeout(() => setDisplay(""), 220);
    return () => clearTimeout(t);
  }, [message]);

  if (!display) return null;
  return (
    <span
      role="alert"
      className={cn(
        "inline-block origin-left transition-[opacity,transform] duration-200 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-0.5",
        className,
      )}
    >
      {display}
    </span>
  );
}

import { useEffect, useState } from "react";

import {
  isRecaptchaEnabled,
  refreshRecaptchaConfig,
} from "@/lib/recaptcha";

const linkClass =
  "underline underline-offset-2 decoration-muted-foreground/40 hover:text-muted-foreground hover:decoration-muted-foreground/70";

/**
 * Aviso obrigatório quando o badge do reCAPTCHA v3 está oculto.
 * @see https://developers.google.com/recaptcha/docs/faq
 */
export default function RecaptchaFooterNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void refreshRecaptchaConfig().then(() => {
      setVisible(isRecaptchaEnabled());
    });
  }, []);

  if (!visible) return null;

  return (
    <p className="text-[10px] leading-relaxed text-muted-foreground/75">
      Este site é protegido pelo reCAPTCHA e aplicam-se a{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Política de Privacidade
      </a>{" "}
      e os{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Termos de Serviço
      </a>{" "}
      do Google.
    </p>
  );
}

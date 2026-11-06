import { Music } from "lucide-react";

import { openColetaneaApp } from "@/coletanea/entry";

/** Acima do selo do reCAPTCHA (60px) e do menu inferior no celular. */
const ABOVE_CAPTCHA =
  "bottom-[calc(5.25rem+60px+0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.25rem+60px+0.75rem)]";

export default function ColetaneaMenuButton() {
  return (
    <button
      type="button"
      onClick={openColetaneaApp}
      aria-label="Abrir a coletânea"
      title="Coletânea"
      className={`fixed right-2 z-50 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl ring-1 ring-black/10 transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-6 ${ABOVE_CAPTCHA}`}
    >
      <Music className="h-7 w-7" aria-hidden />
    </button>
  );
}

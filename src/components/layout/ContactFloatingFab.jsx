import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";

import ContactInfoIconLinks from "@/components/contato/ContactInfoIconLinks";
import useSiteContactDetails from "@/hooks/useSiteContactDetails";
import { hasSiteContactDetails } from "@/lib/contactDetails";
import { cn } from "@/lib/utils";

const fabAnchorClass = cn(
  "bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))]",
  "right-[max(1rem,env(safe-area-inset-right,0px))]",
  "sm:bottom-[10rem] sm:right-6",
);

export default function ContactFloatingFab() {
  const [open, setOpen] = useState(false);
  const contactDetails = useSiteContactDetails();
  const hasDetails = hasSiteContactDetails(contactDetails);

  useEffect(() => {
    const openContact = () => setOpen(true);
    window.addEventListener("icer-open-contato", openContact);
    return () => window.removeEventListener("icer-open-contato", openContact);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!hasDetails) return null;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fechar painel de contato"
          className="fixed inset-0 z-[39] bg-black/15 sm:bg-black/25"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "fixed z-40 flex flex-row-reverse items-end gap-3",
          fabAnchorClass,
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Fechar contato" : "Abrir contato"}
          aria-expanded={open}
          aria-controls="contact-fab-panel"
          title="Contato"
          className={cn(
            "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
            "bg-accent text-accent-foreground shadow-xl ring-1 ring-black/10",
            "transition-transform duration-200 hover:scale-105 active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          {open ? (
            <X className="h-7 w-7" aria-hidden />
          ) : (
            <Phone className="h-7 w-7" aria-hidden />
          )}
        </button>

        {open ? (
          <div
            id="contact-fab-panel"
            role="dialog"
            aria-label="Canais de contacto"
            className={cn(
              "rounded-2xl border border-white/[0.08] bg-[#0B1220] p-3",
              "shadow-2xl ring-1 ring-black/20",
              "origin-bottom-right animate-in fade-in-0 slide-in-from-right-4 duration-200",
            )}
          >
            <ContactInfoIconLinks
              details={contactDetails}
              onLinkClick={() => setOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

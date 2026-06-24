import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";

import ContactInfoIconLinks from "@/components/contato/ContactInfoIconLinks";
import useSiteContactDetails from "@/hooks/useSiteContactDetails";
import { hasSiteContactDetails } from "@/lib/contactDetails";
import { cn } from "@/lib/utils";

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
          className="fixed inset-0 z-[39] bg-black/5 sm:bg-black/25"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "fixed z-40 flex flex-row-reverse items-end gap-2 sm:gap-3",
          "max-sm:right-[max(1rem,env(safe-area-inset-right,0px))]",
          "max-sm:bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))]",
          "sm:bottom-[10rem] sm:right-6",
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
            "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14",
            "border border-white/10 bg-accent/35 text-accent-foreground backdrop-blur-md",
            "shadow-md shadow-black/10 ring-1 ring-black/5",
            "sm:border-transparent sm:bg-accent sm:shadow-xl sm:ring-black/10 sm:backdrop-blur-none",
            open && "max-sm:bg-accent/55 max-sm:border-white/15",
            "transition-[transform,background-color,opacity] duration-200 hover:scale-105 active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          {open ? (
            <X className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          ) : (
            <Phone className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          )}
        </button>

        {open ? (
          <div
            id="contact-fab-panel"
            role="dialog"
            aria-label="Canais de contacto"
            className={cn(
              "rounded-2xl border border-white/[0.05] bg-[#0B1220]/45 p-2.5 backdrop-blur-xl",
              "shadow-lg shadow-black/10 ring-1 ring-white/[0.04]",
              "sm:border-white/[0.08] sm:bg-[#0B1220] sm:p-3 sm:shadow-2xl sm:ring-black/20 sm:backdrop-blur-none",
              "origin-bottom-right animate-in fade-in-0 slide-in-from-right-4 duration-200",
            )}
          >
            <ContactInfoIconLinks
              details={contactDetails}
              onLinkClick={() => setOpen(false)}
              className="max-sm:[&_a]:h-10 max-sm:[&_a]:w-10 max-sm:[&_a]:border-white/[0.06] max-sm:[&_a]:bg-[#08111F]/35 max-sm:[&_a]:backdrop-blur-sm"
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

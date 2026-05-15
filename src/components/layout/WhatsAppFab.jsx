import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { getSiteConfig } from "@/lib/siteConfig";

/**
 * Extrai apenas dígitos e prefixa com "55" (Brasil) caso o número já não
 * tenha um prefixo internacional. Retorna string vazia se não houver número.
 */
function normalizeWhatsappNumber(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const digits = s.replace(/\D+/g, "");
  if (!digits) return "";
  // Já tem código de país (assumir 11+ dígitos)
  if (digits.length >= 12 && digits.startsWith("55")) return digits;
  if (digits.length >= 12) return digits;
  return `55${digits}`;
}

function readWhatsappNumber(cfg) {
  const explicit = cfg?.whatsappNumber || cfg?.footerWhatsapp;
  return normalizeWhatsappNumber(explicit || cfg?.footerTelefone || "");
}

export default function WhatsAppFab() {
  const [number, setNumber] = useState(() =>
    readWhatsappNumber(getSiteConfig()),
  );

  useEffect(() => {
    const sync = () => setNumber(readWhatsappNumber(getSiteConfig()));
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  if (!number) return null;

  const href = `https://wa.me/${number}?text=${encodeURIComponent(
    "Olá! Gostaria de mais informações sobre a ICER Chapecó.",
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      title="Falar no WhatsApp"
      className="hidden sm:inline-flex fixed bottom-6 right-6 z-40 group h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl ring-1 ring-black/10 transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <MessageCircle className="h-7 w-7" aria-hidden />
      <span className="sr-only">Falar no WhatsApp</span>
    </a>
  );
}

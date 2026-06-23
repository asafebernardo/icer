import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Mail, Instagram } from "lucide-react";

import { getSiteConfig, FOOTER_SITE_CONFIG_DEFAULTS } from "@/lib/siteConfig";
import {
  normalizeWhatsappUrl,
  resolveSocialLinksFromConfig,
} from "@/lib/socialLinks";
import { cn } from "@/lib/utils";

function WhatsappIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const linkClass =
  "text-[13px] leading-snug text-muted-foreground transition-colors hover:text-foreground";

const iconClass = "mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground/80";

function ContactRow({ icon: Icon, children, className }) {
  return (
    <li className={cn("flex items-start gap-2", className)}>
      <Icon className={iconClass} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export default function Footer() {
  const [cfg, setCfg] = useState(() => ({
    ...FOOTER_SITE_CONFIG_DEFAULTS,
    ...getSiteConfig(),
  }));

  useEffect(() => {
    const sync = () => {
      setCfg({ ...FOOTER_SITE_CONFIG_DEFAULTS, ...getSiteConfig() });
    };
    sync();
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  const value = (field) => String(cfg?.[field] ?? "").trim();

  const endereco = value("footerEndereco");
  const telefone = value("footerTelefone");
  const email = value("footerEmail");
  const encoded = endereco ? encodeURIComponent(endereco) : "";
  const social = resolveSocialLinksFromConfig(cfg);
  const whatsappHref = social.whatsapp || normalizeWhatsappUrl(telefone);
  const instagramHref = social.instagram;

  const horarios = [
    {
      dia: value("footerHorario1Dia"),
      desc: value("footerHorario1Desc"),
    },
    {
      dia: value("footerHorario2Dia"),
      desc: value("footerHorario2Desc"),
    },
  ].filter((h) => h.dia || h.desc);

  return (
    <footer className="relative border-t border-border/80 bg-background text-foreground">
      <div className="container-page relative py-6 sm:py-7">
        <section
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-10 lg:gap-x-14"
          aria-label="Informações do rodapé"
        >
          <div className="flex min-w-0 flex-col gap-4">
            <Link
              to="/Home"
              className="group -mx-1 inline-flex max-w-fit rounded-lg px-1 py-0.5 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="font-display text-[15px] font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-foreground/90">
                ICER Chapecó
              </span>
            </Link>

            <ul className="flex min-w-0 flex-col gap-2">
              {endereco ? (
                <ContactRow icon={MapPin}>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(linkClass, "block break-words [overflow-wrap:anywhere]")}
                    title="Abrir direções no Google Maps"
                  >
                    {endereco}
                  </a>
                </ContactRow>
              ) : null}
              {telefone ? (
                <ContactRow icon={WhatsappIcon}>
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(linkClass, "block truncate")}
                      title="Conversar no WhatsApp"
                    >
                      {telefone}
                    </a>
                  ) : (
                    <span className={cn(linkClass, "block truncate")} title={telefone}>
                      {telefone}
                    </span>
                  )}
                </ContactRow>
              ) : null}
              {email ? (
                <ContactRow icon={Mail}>
                  <a
                    href={`mailto:${email}`}
                    className={cn(linkClass, "block truncate")}
                    title={email}
                  >
                    {email}
                  </a>
                </ContactRow>
              ) : null}
              {instagramHref ? (
                <ContactRow icon={Instagram}>
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(linkClass, "block truncate")}
                    title="Instagram"
                  >
                    Instagram
                  </a>
                </ContactRow>
              ) : null}
            </ul>
          </div>

          <div className="flex min-w-0 flex-col gap-2.5 sm:pt-0.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Horários
            </h2>
            <ul className="flex min-w-0 flex-col gap-2">
              {horarios.map(({ dia, desc }) => (
                <li
                  key={`${dia}-${desc}`}
                  className="text-[13px] leading-snug text-muted-foreground"
                >
                  <span className="font-medium text-foreground/90">{dia}</span>
                  {dia && desc ? (
                    <span className="text-muted-foreground/70"> · </span>
                  ) : null}
                  <span>{desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mt-5 border-t border-border/60 pt-4 text-center">
          <p className="text-[11px] text-muted-foreground/90">
            © {new Date().getFullYear()} ICER Chapecó. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

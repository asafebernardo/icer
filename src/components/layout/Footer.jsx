import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Navigation } from "lucide-react";

import { getSiteConfig, FOOTER_SITE_CONFIG_DEFAULTS } from "@/lib/siteConfig";
import SiteLogoMark from "@/components/layout/SiteLogoMark";
import SiteSocialLinks from "@/components/layout/SiteSocialLinks";
import { hasAnyResolvedSocialLinks } from "@/lib/socialLinks";
import { cn } from "@/lib/utils";

export default function Footer() {
  const [cfg, setCfg] = useState(() => ({
    ...FOOTER_SITE_CONFIG_DEFAULTS,
    ...getSiteConfig(),
  }));
  const [showSocialCol, setShowSocialCol] = useState(() =>
    hasAnyResolvedSocialLinks(getSiteConfig()),
  );

  useEffect(() => {
    const sync = () => {
      setCfg({ ...FOOTER_SITE_CONFIG_DEFAULTS, ...getSiteConfig() });
      setShowSocialCol(hasAnyResolvedSocialLinks(getSiteConfig()));
    };
    sync();
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  const value = (field) => String(cfg?.[field] ?? "").trim();

  const endereco = value("footerEndereco");
  const encoded = endereco ? encodeURIComponent(endereco) : "";

  const gitBranch = String(import.meta.env.VITE_ICER_GIT_BRANCH || "").trim();

  const sectionTitleClass =
    "font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground";

  return (
    <footer className="relative border-t border-border bg-background text-foreground overflow-hidden">
      <div
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/[0.07] blur-3xl dark:bg-accent/[0.05]"
        aria-hidden
      />
      <div className="container-page relative py-10 lg:py-12">
        <section
          className="grid grid-cols-1 gap-8 sm:gap-9 lg:grid-cols-12 lg:gap-x-8"
          aria-label="Informações do rodapé"
        >
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-3">
            <Link
              to="/Home"
              className="group -m-1 flex max-w-sm items-start gap-3 rounded-xl p-1 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <SiteLogoMark
                imgClassName="h-9 w-auto max-h-10 max-w-[120px] shrink-0 rounded-md object-contain object-left transition-opacity group-hover:opacity-90 sm:max-w-[180px]"
              />
              <div className="min-w-0 pt-0.5">
                <span className="font-display block text-lg font-semibold tracking-tight text-foreground">
                  ICER Chapecó
                </span>
                <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Casa de Oração
                </span>
              </div>
            </Link>
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-col gap-3",
              showSocialCol ? "lg:col-span-5" : "lg:col-span-6",
            )}
          >
            <h2 className={sectionTitleClass}>Contato</h2>
            <ul className="flex min-w-0 flex-col gap-0 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/50 bg-card/40 text-sm text-muted-foreground">
              {endereco ? (
                <>
                  <li className="bg-muted/15">
                    <iframe
                      title="Mapa da ICER Chapecó"
                      src={`https://www.google.com/maps?q=${encoded}&output=embed`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="block h-[100px] w-full sm:h-[108px]"
                      style={{ border: 0 }}
                      allowFullScreen
                    />
                  </li>
                  <li className="flex min-w-0 items-start gap-2.5 px-3 py-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                    <div className="min-w-0 flex-1 break-words leading-relaxed">
                      <span className="block w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
                        {value("footerEndereco")}
                      </span>
                    </div>
                  </li>
                  <li className="px-3 py-2.5">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Como chegar
                    </a>
                  </li>
                </>
              ) : null}
              <li className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                <Phone className="h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <span
                    className="block w-full truncate"
                    title={value("footerTelefone") || undefined}
                  >
                    {value("footerTelefone")}
                  </span>
                </div>
              </li>
              <li className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <span
                    className="block w-full truncate"
                    title={value("footerEmail") || undefined}
                  >
                    {value("footerEmail")}
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-col gap-3",
              showSocialCol ? "lg:col-span-2" : "lg:col-span-3",
            )}
          >
            <h2 className={sectionTitleClass}>Horários</h2>
            <ul className="flex min-w-0 flex-col gap-0 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/50 bg-card/40 px-3 py-1 text-sm text-muted-foreground">
              <li className="flex min-w-0 gap-2.5 py-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5 break-words [overflow-wrap:anywhere]">
                  <p className="font-medium text-foreground">{value("footerHorario1Dia")}</p>
                  <p className="leading-relaxed">{value("footerHorario1Desc")}</p>
                </div>
              </li>
              <li className="flex min-w-0 gap-2.5 py-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5 break-words [overflow-wrap:anywhere]">
                  <p className="font-medium text-foreground">{value("footerHorario2Dia")}</p>
                  <p className="leading-relaxed">{value("footerHorario2Desc")}</p>
                </div>
              </li>
            </ul>
          </div>

          {showSocialCol ? (
            <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
              <SiteSocialLinks variant="footer" />
            </div>
          ) : null}
        </section>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-border/80 pt-8 text-center sm:mt-11 sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ICER Chapecó. Todos os direitos reservados.
          </p>
        </div>
        {gitBranch ? (
          <p
            className="mt-4 text-center text-[10px] font-mono tracking-wide text-muted-foreground/70"
            title="Branch Git no momento do build"
          >
            Versão: {gitBranch}
          </p>
        ) : null}
      </div>
    </footer>
  );
}

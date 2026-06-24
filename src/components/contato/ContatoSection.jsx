import { Link } from "react-router-dom";
import { Clock, Mail, MapPin, Phone, Settings2 } from "lucide-react";

import SiteSocialLinks from "@/components/layout/SiteSocialLinks";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import useSiteContactDetails from "@/hooks/useSiteContactDetails";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { isAdminUser, MENU } from "@/lib/auth";
import useCanEdit from "@/lib/useCanEdit";
import {
  buildContactLinks,
  hasSiteContactDetails,
  mergeSiteContactConfig,
} from "@/lib/contactDetails";
import { FOOTER_SITE_CONFIG_DEFAULTS, getSiteConfig } from "@/lib/siteConfig";
import { resolveSocialLinksFromConfig } from "@/lib/socialLinks";
import useSiteContactConfig from "@/hooks/useSiteContactConfig";
import { cn } from "@/lib/utils";

function ContactCard({ icon: Icon, title, children, href, external }) {
  const content = (
    <>
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#08111F]/60 text-[#38BDF8]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </>
  );

  const className = cn(
    "flex h-full flex-col rounded-2xl border border-white/[0.06] bg-card/80 p-5 shadow-sm backdrop-blur-sm",
    "transition-colors hover:border-[#38BDF8]/20",
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(className, "focus-ring")}
      >
        {content}
      </a>
    );
  }

  return <article className={className}>{content}</article>;
}

export default function ContatoSection() {
  const details = useSiteContactDetails();
  const { footerDescricao, footerHorario1Dia, footerHorario1Desc, footerHorario2Dia, footerHorario2Desc } =
    useSiteContactConfig();
  const links = buildContactLinks(details);
  const hasDetails = hasSiteContactDetails(details);
  const user = useSyncedAuthUser();
  const canEditSite = useCanEdit(MENU.HOME);
  const isAdmin = isAdminUser(user);

  const addressLink = links.find((l) => l.key === "address");
  const phoneLink = links.find((l) => l.key === "whatsapp" || l.key === "phone");
  const emailLink = links.find((l) => l.key === "email");

  const horarios = [
    { dia: footerHorario1Dia, desc: footerHorario1Desc },
    { dia: footerHorario2Dia, desc: footerHorario2Desc },
  ].filter((h) => String(h.dia || "").trim() || String(h.desc || "").trim());

  const socialLinks = resolveSocialLinksFromConfig(mergeSiteContactConfig(getSiteConfig()));
  const hasSocial =
    socialLinks.instagram || socialLinks.facebook || socialLinks.whatsapp;

  return (
    <section className="relative min-h-[calc(100vh-4.75rem)] border-t border-border/60 bg-card/25 py-10 sm:py-14 lg:py-20">
      <div className="container-page min-w-0">
        {canEditSite && isAdmin ? (
          <div className="mb-6 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <Link to="/Admin?tab=site">
                <Settings2 className="h-4 w-4" />
                Configurar contacto
              </Link>
            </Button>
          </div>
        ) : null}

        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-accent">
            Contato
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Fale conosco
          </h1>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-accent/60" />
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            {footerDescricao || FOOTER_SITE_CONFIG_DEFAULTS.footerDescricao}
          </p>
        </div>

        {!hasDetails && horarios.length === 0 ? (
          <EmptyState
            title="Contacto em breve"
            description="Os dados de contacto ainda não foram publicados."
            compact
          />
        ) : (
          <div className="mx-auto max-w-4xl space-y-8">
            {hasDetails ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {details.endereco ? (
                  <ContactCard
                    icon={MapPin}
                    title="Endereço"
                    href={addressLink?.href}
                    external
                  >
                    {details.endereco}
                  </ContactCard>
                ) : null}
                {details.telefone ? (
                  <ContactCard
                    icon={Phone}
                    title="Telefone / WhatsApp"
                    href={phoneLink?.href}
                    external={phoneLink?.external}
                  >
                    {details.telefone}
                  </ContactCard>
                ) : null}
                {details.email ? (
                  <ContactCard icon={Mail} title="E-mail" href={emailLink?.href}>
                    {details.email}
                  </ContactCard>
                ) : null}
              </div>
            ) : null}

            {horarios.length > 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-card/80 p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-foreground">
                  <Clock className="h-5 w-5 text-accent" aria-hidden />
                  <h2 className="font-display text-lg font-semibold">Horários</h2>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {horarios.map((item, index) => (
                    <li
                      key={`${item.dia}-${index}`}
                      className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3"
                    >
                      {item.dia ? (
                        <p className="text-sm font-semibold text-foreground">{item.dia}</p>
                      ) : null}
                      {item.desc ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasSocial ? (
              <div className="rounded-2xl border border-white/[0.06] bg-card/80 p-5 sm:p-6">
                <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
                  Redes sociais
                </h2>
                <ul className="divide-y divide-border/60 rounded-xl border border-border/70 bg-muted/10">
                  <SiteSocialLinks variant="contact" />
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

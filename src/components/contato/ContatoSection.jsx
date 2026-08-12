import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, Settings2 } from "lucide-react";

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

function WhatsappIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ContactCard({
  icon: Icon,
  title,
  children,
  href,
  external,
  iconClassName,
}) {
  const content = (
    <>
      <span
        className={cn(
          "mb-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary sm:mb-3",
          iconClassName,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      {title ? (
        <h3 className="font-display text-sm font-semibold text-foreground sm:text-base">
          {title}
        </h3>
      ) : null}
      {children != null ? (
        <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground break-words">
          {children}
        </div>
      ) : null}
    </>
  );

  const className = cn(
    "contact-card-premium flex h-full min-w-0 flex-col rounded-2xl p-4 transition-all duration-300 sm:p-5",
    "hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)]",
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(className, "focus-ring")}
        aria-label={title}
      >
        {content}
      </a>
    );
  }

  return (
    <article className={className} aria-label={title}>
      {content}
    </article>
  );
}

export default function ContatoSection() {
  const details = useSiteContactDetails();
  const { footerDescricao } = useSiteContactConfig();
  const links = buildContactLinks(details);
  const hasDetails = hasSiteContactDetails(details);
  const user = useSyncedAuthUser();
  const canEditSite = useCanEdit(MENU.HOME);
  const isAdmin = isAdminUser(user);

  const addressLink = links.find((l) => l.key === "address");
  const phoneLink = links.find((l) => l.key === "whatsapp" || l.key === "phone");
  const emailLink = links.find((l) => l.key === "email");

  const socialLinks = resolveSocialLinksFromConfig(mergeSiteContactConfig(getSiteConfig()));
  const socialItems = [
    socialLinks.instagram
      ? {
          key: "ig",
          href: socialLinks.instagram,
          title: "Instagram",
          Icon: Instagram,
          iconClassName: "text-[#E4405F] border-pink-500/20 bg-pink-500/10",
        }
      : null,
    socialLinks.facebook
      ? {
          key: "fb",
          href: socialLinks.facebook,
          title: "Facebook",
          Icon: Facebook,
          iconClassName: "text-[#0866FF] border-blue-500/20 bg-blue-500/10",
        }
      : null,
    socialLinks.whatsapp
      ? {
          key: "wa",
          href: socialLinks.whatsapp,
          title: "WhatsApp",
          Icon: WhatsappIcon,
          iconClassName: "text-[#25D366] border-emerald-500/20 bg-emerald-500/10",
        }
      : null,
  ].filter(Boolean);
  const hasSocial = socialItems.length > 0;

  return (
    <section
      id="contato"
      className="relative scroll-mt-[4.75rem] border-t border-border/30 py-12 sm:py-16 lg:py-20"
    >
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
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Fale conosco
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-accent/60" />
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            {footerDescricao || FOOTER_SITE_CONFIG_DEFAULTS.footerDescricao}
          </p>
        </div>

        {!hasDetails && !hasSocial ? (
          <EmptyState
            title="Contacto em breve"
            description="Os dados de contacto ainda não foram publicados."
            compact
          />
        ) : (
          <div className="grid w-full grid-cols-2 gap-3">
            {details.endereco ? (
              <ContactCard
                icon={MapPin}
                title="Endereço"
                href={addressLink?.href}
                external
                iconClassName="text-[#EA4335] border-red-500/20 bg-red-500/10"
              >
                {details.endereco}
              </ContactCard>
            ) : null}
            {details.telefone ? (
              <ContactCard
                icon={WhatsappIcon}
                title="Telefone / WhatsApp"
                href={phoneLink?.href}
                external={phoneLink?.external}
                iconClassName="text-[#25D366] border-emerald-500/20 bg-emerald-500/10"
              >
                {details.telefone}
              </ContactCard>
            ) : null}
            {details.email ? (
              <ContactCard
                icon={Mail}
                title="E-mail"
                href={emailLink?.href}
                iconClassName="text-[#4285F4] border-blue-500/20 bg-blue-500/10"
              >
                {details.email}
              </ContactCard>
            ) : null}
            {socialItems.map((item) => (
              <ContactCard
                key={item.key}
                icon={item.Icon}
                title={item.title}
                href={item.href}
                external
                iconClassName={item.iconClassName}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

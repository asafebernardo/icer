import { FOOTER_SITE_CONFIG_DEFAULTS } from "@/lib/siteConfig";
import {
  normalizeWhatsappUrl,
  resolveSocialLinksFromConfig,
} from "@/lib/socialLinks";

/**
 * @param {Record<string, unknown>} cfg
 */
export function resolveSiteContactDetails(cfg) {
  const value = (field) => String(cfg?.[field] ?? "").trim();
  const endereco = value("footerEndereco");
  const telefone = value("footerTelefone");
  const email = value("footerEmail");
  const social = resolveSocialLinksFromConfig(cfg);
  const whatsappHref = social.whatsapp || normalizeWhatsappUrl(telefone);
  const mapsHref = endereco
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`
    : "";

  return {
    endereco,
    telefone,
    email,
    whatsappHref,
    mapsHref,
    instagramHref: social.instagram,
  };
}

/**
 * Links clicáveis derivados dos dados de contacto (maps, WhatsApp/tel, e-mail, Instagram).
 * @param {ReturnType<typeof resolveSiteContactDetails>} details
 */
export function buildContactLinks(details) {
  const items = [];

  if (details.endereco && details.mapsHref) {
    items.push({
      key: "address",
      href: details.mapsHref,
      label: `Endereço: ${details.endereco}`,
      external: true,
      type: "map",
    });
  }

  if (details.telefone && details.whatsappHref) {
    items.push({
      key: "whatsapp",
      href: details.whatsappHref,
      label: `WhatsApp: ${details.telefone}`,
      external: true,
      type: "whatsapp",
    });
  } else if (details.telefone) {
    items.push({
      key: "phone",
      href: `tel:${details.telefone.replace(/[^\d+]/g, "")}`,
      label: `Telefone: ${details.telefone}`,
      external: false,
      type: "whatsapp",
    });
  }

  if (details.email) {
    items.push({
      key: "email",
      href: `mailto:${details.email}`,
      label: `E-mail: ${details.email}`,
      external: false,
      type: "mail",
    });
  }

  if (details.instagramHref) {
    items.push({
      key: "instagram",
      href: details.instagramHref,
      label: "Instagram",
      external: true,
      type: "instagram",
    });
  }

  return items;
}

/** @param {ReturnType<typeof resolveSiteContactDetails>} details */
export function hasSiteContactDetails(details) {
  return buildContactLinks(details).length > 0;
}

export function mergeSiteContactConfig(cfg) {
  return { ...FOOTER_SITE_CONFIG_DEFAULTS, ...cfg };
}

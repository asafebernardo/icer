import {
  DEFAULT_CHANNEL_URL,
  DEFAULT_INSTAGRAM_URL,
} from "@/lib/homeContentDefaults";

export function normalizeHttpUrl(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function normalizeWhatsappUrl(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 8) return `https://wa.me/${digits}`;
  return normalizeHttpUrl(t);
}

/**
 * URLs públicas para ícones no cabeçalho/rodapé.
 * `social*` tem prioridade quando preenchidos; valores vazios caem para `channelUrl` /
 * `instagramUrl` e depois para os defaults (comportamento da antiga secção da home).
 */
export function resolveSocialLinksFromConfig(cfg) {
  const c = cfg && typeof cfg === "object" ? cfg : {};

  const own = (k) => Object.prototype.hasOwnProperty.call(c, k);

  let youtube = "";
  if (own("socialYoutubeUrl")) {
    const v = String(c.socialYoutubeUrl ?? "").trim();
    if (v) youtube = normalizeHttpUrl(c.socialYoutubeUrl);
  }
  if (!youtube) {
    const leg = String(c.channelUrl ?? "").trim();
    youtube = leg ? normalizeHttpUrl(leg) : normalizeHttpUrl(DEFAULT_CHANNEL_URL);
  }

  let instagram = "";
  if (own("socialInstagramUrl")) {
    const v = String(c.socialInstagramUrl ?? "").trim();
    if (v) instagram = normalizeHttpUrl(c.socialInstagramUrl);
  }
  if (!instagram) {
    const leg = String(c.instagramUrl ?? "").trim();
    instagram = leg ? normalizeHttpUrl(leg) : normalizeHttpUrl(DEFAULT_INSTAGRAM_URL);
  }

  let facebook = "";
  if (own("socialFacebookUrl")) {
    facebook = String(c.socialFacebookUrl ?? "").trim()
      ? normalizeHttpUrl(c.socialFacebookUrl)
      : "";
  }

  let whatsapp = "";
  if (own("socialWhatsappUrl")) {
    whatsapp = String(c.socialWhatsappUrl ?? "").trim()
      ? normalizeWhatsappUrl(c.socialWhatsappUrl)
      : "";
  }

  return { youtube, instagram, facebook, whatsapp };
}

/** Há pelo menos um ícone de rede para mostrar no rodapé. */
export function hasAnyResolvedSocialLinks(cfg) {
  const r = resolveSocialLinksFromConfig(cfg);
  return !!(r.youtube || r.instagram || r.facebook || r.whatsapp);
}

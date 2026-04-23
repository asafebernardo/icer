import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Instagram, Youtube } from "lucide-react";
import { getSiteConfig } from "@/lib/siteConfig";
import { normalizeHttpUrl } from "@/lib/socialLinks";
import {
  DEFAULT_HOME_INSTAGRAM_CARD_TEXT,
  DEFAULT_HOME_INSTAGRAM_CARD_TITLE,
  DEFAULT_HOME_INSTAGRAM_CARD_URL,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_SUBTITLE,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_TAG,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_TITLE,
  DEFAULT_HOME_YOUTUBE_CARD_TEXT,
  DEFAULT_HOME_YOUTUBE_CARD_TITLE,
  DEFAULT_HOME_YOUTUBE_CARD_URL,
} from "@/lib/homeContentDefaults";

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function pickStr(c, key, fallback) {
  if (own(c, key)) {
    const t = String(c[key] ?? "").trim();
    return t || fallback;
  }
  return fallback;
}

/** Se a chave existir e estiver vazia → sem URL (cartão oculto). Se não existir → URL por omissão. */
function pickCardUrl(c, key, defaultUrl) {
  if (own(c, key)) {
    const t = String(c[key] ?? "").trim();
    return t ? normalizeHttpUrl(t) : "";
  }
  return normalizeHttpUrl(defaultUrl);
}

function readCards(cfg) {
  const c = cfg && typeof cfg === "object" ? cfg : {};
  return {
    sectionTag: pickStr(
      c,
      "homeSocialCardsSectionTag",
      DEFAULT_HOME_SOCIAL_CARDS_SECTION_TAG,
    ),
    sectionTitle: pickStr(
      c,
      "homeSocialCardsSectionTitle",
      DEFAULT_HOME_SOCIAL_CARDS_SECTION_TITLE,
    ),
    sectionSubtitle: pickStr(
      c,
      "homeSocialCardsSectionSubtitle",
      DEFAULT_HOME_SOCIAL_CARDS_SECTION_SUBTITLE,
    ),
    youtube: {
      url: pickCardUrl(c, "homeYoutubeCardUrl", DEFAULT_HOME_YOUTUBE_CARD_URL),
      title: pickStr(c, "homeYoutubeCardTitle", DEFAULT_HOME_YOUTUBE_CARD_TITLE),
      text: pickStr(c, "homeYoutubeCardText", DEFAULT_HOME_YOUTUBE_CARD_TEXT),
    },
    instagram: {
      url: pickCardUrl(c, "homeInstagramCardUrl", DEFAULT_HOME_INSTAGRAM_CARD_URL),
      title: pickStr(
        c,
        "homeInstagramCardTitle",
        DEFAULT_HOME_INSTAGRAM_CARD_TITLE,
      ),
      text: pickStr(
        c,
        "homeInstagramCardText",
        DEFAULT_HOME_INSTAGRAM_CARD_TEXT,
      ),
    },
  };
}

export default function HomeSocialCardsSection() {
  const [cards, setCards] = useState(() => readCards(getSiteConfig()));

  useEffect(() => {
    const sync = () => setCards(readCards(getSiteConfig()));
    sync();
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  const visible = useMemo(
    () => ({
      yt: Boolean(cards.youtube.url),
      ig: Boolean(cards.instagram.url),
    }),
    [cards],
  );

  if (!visible.yt && !visible.ig) return null;

  return (
    <section
      className="relative border-y border-border/60 bg-muted/25"
      aria-labelledby="home-social-cards-heading"
    >
      <div className="container-page py-10 sm:py-12">
        <div className="flex flex-col items-center text-center mb-12 sm:mb-16 max-w-4xl mx-auto">
          <span className="text-accent font-semibold text-sm tracking-wider uppercase mb-3">
            {cards.sectionTag}
          </span>
          <h2
            id="home-social-cards-heading"
            className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight"
          >
            {cards.sectionTitle}
          </h2>
          <div className="mt-4 w-16 h-1 rounded-full bg-accent/60" aria-hidden />
          <p className="mt-5 text-muted-foreground max-w-xl">
            {cards.sectionSubtitle}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 max-w-4xl mx-auto">
          {visible.yt ? (
            <a
              href={cards.youtube.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col rounded-2xl p-6 sm:p-7 text-white shadow-lg ring-1 ring-black/10 overflow-hidden transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-gradient-to-br from-[#FF0033] via-[#CC0000] to-[#7A0000]"
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-center gap-2 mb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Youtube className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
                  YouTube
                </span>
              </div>
              <h3 className="relative font-display text-xl font-semibold tracking-tight mb-2">
                {cards.youtube.title}
              </h3>
              <p className="relative text-sm text-white/90 leading-relaxed flex-1 mb-5">
                {cards.youtube.text}
              </p>
              <span className="relative inline-flex items-center gap-2 text-sm font-medium text-white group-hover:underline">
                Abrir link
                <ExternalLink className="h-4 w-4 opacity-90" aria-hidden />
              </span>
            </a>
          ) : null}

          {visible.ig ? (
            <a
              href={cards.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col rounded-2xl p-6 sm:p-7 text-white shadow-lg ring-1 ring-black/10 overflow-hidden transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]"
            >
              <div
                className="pointer-events-none absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-white/15 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-center gap-2 mb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Instagram className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
                  Instagram
                </span>
              </div>
              <h3 className="relative font-display text-xl font-semibold tracking-tight mb-2">
                {cards.instagram.title}
              </h3>
              <p className="relative text-sm text-white/90 leading-relaxed flex-1 mb-5">
                {cards.instagram.text}
              </p>
              <span className="relative inline-flex items-center gap-2 text-sm font-medium text-white group-hover:underline">
                Abrir link
                <ExternalLink className="h-4 w-4 opacity-90" aria-hidden />
              </span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

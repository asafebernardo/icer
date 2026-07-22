/** Valores por omissão do conteúdo editável da página inicial (localStorage `icer_site_config`). */

export const DEFAULT_HERO_EYEBROW = "";
export const DEFAULT_HERO_TITLE = "ICER Chapecó";

/** Textos antigos do hero — tratados como «não definidos» para aplicar o novo default. */
const LEGACY_HERO_EYEBROWS = new Set(["Casa de Oração", "CASA DE ORAÇÃO"]);
const LEGACY_HERO_TITLES = new Set(["Bem-vindo à ICER Chapecó"]);

/** @param {string | null | undefined} eyebrow */
/** @param {string | null | undefined} title */
export function resolveHeroCopy(eyebrow, title) {
  const rawEyebrow = String(eyebrow ?? "").trim();
  const rawTitle = String(title ?? "").trim();
  const nextEyebrow = LEGACY_HERO_EYEBROWS.has(rawEyebrow) ? "" : rawEyebrow;
  const nextTitle =
    !rawTitle || LEGACY_HERO_TITLES.has(rawTitle)
      ? DEFAULT_HERO_TITLE
      : rawTitle;
  return {
    eyebrow: nextEyebrow || DEFAULT_HERO_EYEBROW,
    title: nextTitle || DEFAULT_HERO_TITLE,
  };
}

export const DEFAULT_WELCOME_TAG = "Sobre nós";
export const DEFAULT_WELCOME_TITLE = "Bem-vindo!";
export const DEFAULT_WELCOME_SUBTITLE = "";
const LEGACY_WELCOME_SUBTITLES = new Set([
  "Conheça um pouco da nossa história e dos valores que nos unem.",
]);

/** @param {string | null | undefined} subtitle */
export function resolveWelcomeSubtitle(subtitle) {
  const raw = String(subtitle ?? "").trim();
  if (!raw || LEGACY_WELCOME_SUBTITLES.has(raw)) return DEFAULT_WELCOME_SUBTITLE;
  return raw;
}
export const DEFAULT_WELCOME_P1 =
  "Somos uma família comprometida com a pregação do evangelho de Jesus Cristo. Queremos deixar claro que Cristo é o centro de tudo para nós. Evitamos colocar qualquer pessoa no lugar que pertence a Jesus.";
export const DEFAULT_WELCOME_P2 =
  "Quando mantemos Cristo no centro, nossa forma de viver muda naturalmente. Isso nos leva a demonstrar mais amor ao próximo, porque é isso que Ele nos ensinou. Nosso objetivo é ser uma comunidade verdadeiramente centrada em Cristo, colocando Ele acima de tudo.";

export const DEFAULT_VERSE_TEXT =
  '"Porque Deus amou o mundo de tal maneira que deu seu Filho unigênito, para que todo aquele que nele crê, não pereça mas tenha a vida eterna"';
export const DEFAULT_VERSE_REF = "— João 3:16";
export const DEFAULT_VERSE_IMAGE_URL = "/images/verse-card-earth.webp";

/** Secção do canal (entre Sobre e Horários) — cabeçalho + link + carrossel */
export const DEFAULT_CHANNEL_SECTION_TAG = "Online";
export const DEFAULT_CHANNEL_SECTION_TITLE = "Nosso canal no YouTube";
export const DEFAULT_CHANNEL_SECTION_SUBTITLE =
  "Acompanhe cultos, mensagens e estudos em vídeo.";
export const DEFAULT_CHANNEL_URL = "https://www.youtube.com";

export const DEFAULT_INSTAGRAM_SECTION_TITLE = "Instagram";
export const DEFAULT_INSTAGRAM_SECTION_SUBTITLE =
  "Acompanhe novidades e avisos rápidos no nosso perfil.";
export const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com";

/** Cartões YouTube + Instagram na home (após «Sobre nós») — `siteConfig` */
export const DEFAULT_HOME_SOCIAL_CARDS_SECTION_TAG = "Online";
export const DEFAULT_HOME_SOCIAL_CARDS_SECTION_TITLE = "Redes sociais";
export const DEFAULT_HOME_SOCIAL_CARDS_SECTION_SUBTITLE =
  "Acompanhe cultos em vídeo, novidades e avisos nos nossos canais oficiais.";

export const DEFAULT_HOME_YOUTUBE_CARD_TITLE = "Nosso canal no YouTube";
export const DEFAULT_HOME_YOUTUBE_CARD_TEXT =
  "Acompanhe cultos, mensagens e estudos em vídeo.";
export const DEFAULT_HOME_YOUTUBE_CARD_URL = DEFAULT_CHANNEL_URL;

export const DEFAULT_HOME_INSTAGRAM_CARD_TITLE = "Instagram";
export const DEFAULT_HOME_INSTAGRAM_CARD_TEXT =
  "Acompanhe novidades e avisos rápidos no nosso perfil.";
export const DEFAULT_HOME_INSTAGRAM_CARD_URL = DEFAULT_INSTAGRAM_URL;

/** Chaves em `siteConfig` para fundos por secção (home) */
export const SECTION_BG_KEYS = {
  welcome: "sectionBgWelcome",
  serviceTimes: "sectionBgServiceTimes",
};

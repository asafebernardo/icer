import {
  POST_CATEGORIA_LABELS,
  POST_FEED_SECTION_LABELS,
  categoryUsesYearPostList,
  getPostCategoryGroupId,
  isEventosYearFirstGroup,
  resolvePostCategoria,
} from "@/lib/postCategories";
import {
  categoryUsesYearMosaic,
  getPostPublicationYear,
  normalizePost,
  postYearToQueryValue,
} from "@/lib/posts";

/** Publicações de eventos (cultos, encontros, festividades, etc.). */
export const POSTS_HUB_PATH = "/Eventos";
export const POSTS_HUB_LABEL = "Eventos";
export const POSTS_HUB_TITLE = "Encontros e memórias";
export const POSTS_HUB_DESCRIPTION =
  "Registros de cultos, encontros, festividades e conferências.";

/** Aplicativos e contacto (hub na página Início). */
export const INFORMACOES_HUB_PATH = "/Home";
export const INFORMACOES_HUB_LABEL = "Informações";
export const INFORMACOES_HUB_TITLE = "Aplicativos";
export const INFORMACOES_HUB_DESCRIPTION =
  "Materiais e links úteis da comunidade.";
export const INFORMACOES_APLICATIVOS_PATH = `${INFORMACOES_HUB_PATH}#informacoes`;

/** Base das rotas de categoria (mantém `/Informacoes/categoria/...`). */
export const INFORMACOES_CATEGORY_BASE = "/Informacoes";

/** Secção de contacto no final da página Início. */
export const INFORMACOES_CONTATO_PATH = `${INFORMACOES_HUB_PATH}#contato`;

/** Agenda (calendário) — rota directa, fora do hub Informações. */
export const AGENDA_PATH = "/Agenda";

/** @param {{ tab?: "eventos" | "configuracoes"; novo?: boolean }} [opts] */
export function getInformacoesAgendaPath({ tab, novo = false } = {}) {
  const params = new URLSearchParams();
  if (tab === "configuracoes") params.set("tab", "configuracoes");
  else if (tab === "eventos") params.set("tab", "eventos");
  if (novo) params.set("novo", "1");
  const q = params.toString();
  return q ? `${AGENDA_PATH}?${q}` : AGENDA_PATH;
}

/** @param {string} catKey */
export function getPostCategoryLabel(catKey) {
  const k = String(catKey || "").trim().toLowerCase();
  return POST_FEED_SECTION_LABELS[k] || POST_CATEGORIA_LABELS[k] || k;
}

/** Rótulo do botão «Novo …» conforme a categoria actual. */
export function getPostCreateButtonLabel(catKey) {
  const k = String(catKey || "").trim().toLowerCase();
  if (!k) return "Novo post";
  return `Novo ${getPostCategoryLabel(k)}`;
}

/** @param {string | null | undefined} groupId */
export function getPostsHubForGroup(groupId) {
  const id = String(groupId || "").trim().toLowerCase();
  if (id === "informacoes") {
    return { path: INFORMACOES_HUB_PATH, label: INFORMACOES_HUB_LABEL };
  }
  return { path: POSTS_HUB_PATH, label: POSTS_HUB_LABEL };
}

/** @param {string | null | undefined} categoryKey */
export function getPostsHubForCategory(categoryKey) {
  return getPostsHubForGroup(getPostCategoryGroupId(categoryKey));
}

/**
 * @param {string} categoryKey
 * @param {{ search?: string }} [opts]
 */
export function getPostCategoryPath(categoryKey, { search = "" } = {}) {
  const catKey = String(categoryKey || "").trim().toLowerCase();
  const hub = getPostsHubForCategory(catKey);
  const basePath =
    getPostCategoryGroupId(catKey) === "informacoes"
      ? INFORMACOES_CATEGORY_BASE
      : hub.path;
  const base = `${basePath}/categoria/${encodeURIComponent(catKey)}`;
  if (!search) return base;
  return search.startsWith("?") ? `${base}${search}` : `${base}?${search}`;
}

/**
 * @param {{ groupId?: string | null, categoryKey?: string | null, year?: number | null, includeYear?: boolean, postTitle?: string | null }} opts
 * @returns {Array<{ label: string, href?: string | null }>}
 */
export function buildPostsNavPath({
  groupId,
  categoryKey,
  year,
  includeYear,
  postTitle,
} = {}) {
  const catKey = String(categoryKey || "").trim().toLowerCase();
  const resolvedGroupId =
    String(groupId || "").trim().toLowerCase() ||
    (catKey ? getPostCategoryGroupId(catKey) : "");
  const hub = getPostsHubForGroup(resolvedGroupId);

  /** @type {Array<{ label: string, href?: string | null }>} */
  const items = [{ label: hub.label, href: hub.path }];

  if (isEventosYearFirstGroup(resolvedGroupId)) {
    const showYear =
      includeYear !== false && year !== undefined;

    if (catKey) {
      const categoryHref =
        showYear
          ? getPostCategoryPath(catKey, {
              search: `ano=${encodeURIComponent(postYearToQueryValue(year))}`,
            })
          : getPostCategoryPath(catKey);
      items.push({
        label: getPostCategoryLabel(catKey),
        href: categoryHref,
      });

      if (showYear) {
        items.push({
          label: year == null ? "Sem data" : String(year),
          href: categoryHref,
        });
      }
    }
  } else if (catKey) {
    items.push({
      label: getPostCategoryLabel(catKey),
      href: getPostCategoryPath(catKey),
    });

    const showYear =
      includeYear !== false &&
      categoryUsesYearMosaic(catKey) &&
      year !== undefined;

    if (showYear) {
      const yearHref = categoryUsesYearPostList(catKey)
        ? getPostCategoryPath(catKey, {
            search: `ano=${encodeURIComponent(postYearToQueryValue(year))}`,
          })
        : null;
      items.push({
        label: year == null ? "Sem data" : String(year),
        href: yearHref,
      });
    }
  }

  if (postTitle) {
    items.push({ label: String(postTitle).trim(), href: null });
  }

  return items;
}

/** @param {object | null | undefined} post */
export function buildPostsNavPathFromPost(post) {
  const p = normalizePost(post);
  const catKey = resolvePostCategoria(p) || "culto_dominical";
  const year = categoryUsesYearMosaic(catKey)
    ? getPostPublicationYear(p)
    : undefined;
  return buildPostsNavPath({
    groupId: getPostCategoryGroupId(catKey),
    categoryKey: catKey,
    year,
    includeYear: year !== undefined && year !== null,
  });
}

/** @param {Array<{ label: string }>} items */
export function formatPostsNavPathPlain(items) {
  return items.map((item) => item.label).join(" › ");
}

/**
 * Caminho de retorno após editor ou ações auxiliares.
 * @param {unknown} from
 * @param {string} [fallback=POSTS_HUB_PATH]
 */
export function resolvePostsReturnPath(from, fallback = POSTS_HUB_PATH) {
  if (typeof from === "string" && from.startsWith("/")) {
    return from;
  }
  return fallback;
}

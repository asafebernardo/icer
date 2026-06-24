import sanitizeHtml from "sanitize-html";
import {
  RICH_HTML_ALLOWED_ATTRS,
  RICH_HTML_ALLOWED_TAGS,
} from "../shared/richHtmlAllowlist.js";

/**
 * Remove scripts, handlers e tags perigosas de HTML de posts antes de gravar ou servir.
 * @param {unknown} input
 * @returns {string}
 */
export function sanitizeRichHtml(input) {
  if (input == null) return "";
  const raw = String(input);
  if (!raw.trim()) return "";

  return sanitizeHtml(raw, {
    allowedTags: RICH_HTML_ALLOWED_TAGS,
    allowedAttributes: RICH_HTML_ALLOWED_ATTRS,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  });
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Record<string, unknown>}
 */
export function sanitizePostBody(body) {
  if (!body || typeof body !== "object") return {};
  const next = { ...body };
  if (typeof next.conteudo === "string") {
    next.conteudo = sanitizeRichHtml(next.conteudo);
  }
  return next;
}

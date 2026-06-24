import DOMPurify from "dompurify";
import {
  RICH_HTML_ALLOWED_ATTRS,
  RICH_HTML_ALLOWED_TAGS,
} from "../../shared/richHtmlAllowlist.js";

const ALLOWED_ATTR = [
  ...new Set(Object.values(RICH_HTML_ALLOWED_ATTRS).flat()),
];

/**
 * Sanitiza HTML antes de `dangerouslySetInnerHTML` (defesa em profundidade no browser).
 * @param {unknown} html
 * @returns {string}
 */
export function sanitizeRichHtml(html) {
  if (html == null) return "";
  const raw = String(html);
  if (!raw.trim()) return "";
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: RICH_HTML_ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target"],
  });
}

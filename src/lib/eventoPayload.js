/** Normaliza `data` para `YYYY-MM-DD` (inputs e API). */
export function normalizeEventoDate(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  try {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {
    /* ignore */
  }
  return s.slice(0, 10);
}

/**
 * Payload limpo para create/update na API (sem id nem metadados read-only).
 */
export function buildEventoApiPayload(form) {
  if (!form || typeof form !== "object") return {};
  const payload = { ...form };
  payload.data = normalizeEventoDate(payload.data);
  delete payload.id;
  delete payload.created_date;
  delete payload.updated_date;
  if (!Array.isArray(payload.programacao)) payload.programacao = [];
  return payload;
}

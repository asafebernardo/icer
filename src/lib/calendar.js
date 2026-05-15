/**
 * Utilidades para gerar URLs de Adicionar à agenda (Google Calendar / .ics)
 * e mensagens de partilha (WhatsApp / copiar link) a partir de um evento.
 *
 * Forma do objeto evento esperado:
 *   { titulo, descricao?, data: "YYYY-MM-DD", horario?: "HH:mm", horario_fim?: "HH:mm", local?: string }
 */

const DEFAULT_DURATION_MIN = 60;

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Combina `data + horario` (locais) num objeto Date interpretado no fuso local.
 * Retorna null se a data for inválida.
 */
function combineDateTime(dateStr, timeStr) {
  const d = String(dateStr || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map(Number);
  let hh = 9;
  let mm = 0;
  const t = String(timeStr || "").trim();
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    hh = Math.min(23, Math.max(0, Number(match[1])));
    mm = Math.min(59, Math.max(0, Number(match[2])));
  }
  const date = new Date(y, m - 1, day, hh, mm, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Converte um Date para o formato compacto UTC que o Google Calendar aceita. */
function toGCalUtcString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const yyyy = date.getUTCFullYear();
  const mm = pad2(date.getUTCMonth() + 1);
  const dd = pad2(date.getUTCDate());
  const hh = pad2(date.getUTCHours());
  const mi = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

/**
 * Retorna `{ start, end }` Dates ou null se a data não puder ser interpretada.
 * Se `horario_fim` ausente, assume `DEFAULT_DURATION_MIN` minutos após o início.
 */
export function getEventoStartEnd(evento) {
  const start = combineDateTime(evento?.data, evento?.horario);
  if (!start) return null;
  let end = combineDateTime(evento?.data, evento?.horario_fim);
  if (!end || end <= start) {
    end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60 * 1000);
  }
  return { start, end };
}

export function buildGoogleCalendarUrl(evento) {
  const range = getEventoStartEnd(evento);
  if (!range) return "";
  const text = encodeURIComponent(String(evento?.titulo || "Evento").trim());
  const details = encodeURIComponent(
    String(evento?.descricao || "").trim() || "",
  );
  const location = encodeURIComponent(String(evento?.local || "").trim() || "");
  const dates = `${toGCalUtcString(range.start)}/${toGCalUtcString(range.end)}`;
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}

function icsEscape(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Gera o conteúdo .ics como string. */
export function buildIcsContent(evento) {
  const range = getEventoStartEnd(evento);
  if (!range) return "";
  const uid = `${(evento?.id || Date.now())}@icer.com.br`;
  const dtstamp = toGCalUtcString(new Date());
  const dtstart = toGCalUtcString(range.start);
  const dtend = toGCalUtcString(range.end);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ICER Chapeco//Eventos//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${icsEscape(evento?.titulo || "Evento")}`,
    evento?.descricao ? `DESCRIPTION:${icsEscape(evento.descricao)}` : null,
    evento?.local ? `LOCATION:${icsEscape(evento.local)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/** Gera um Blob .ics para download. */
export function buildIcsBlob(evento) {
  const content = buildIcsContent(evento);
  if (!content) return null;
  return new Blob([content], { type: "text/calendar;charset=utf-8" });
}

/** Slug seguro para filename. */
function slug(s) {
  return String(s || "evento")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
}

export function downloadIcs(evento) {
  const blob = buildIcsBlob(evento);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(evento?.titulo)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

/** Constrói a URL `wa.me` com mensagem do evento. */
export function buildShareWhatsapp(evento, pageUrl) {
  const linhas = [
    String(evento?.titulo || "Evento").trim(),
    evento?.data
      ? `Data: ${evento.data}${evento?.horario ? ` às ${evento.horario}` : ""}`
      : null,
    evento?.local ? `Local: ${evento.local}` : null,
    pageUrl ? pageUrl : null,
  ].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(linhas.join("\n"))}`;
}

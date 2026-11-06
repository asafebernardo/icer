export const VOICE_HOMENS = "homens";
export const VOICE_MULHERES = "mulheres";

const SHOW_KEY = "coletanea-vozes";

function isVoice(value) {
  return value === VOICE_HOMENS || value === VOICE_MULHERES;
}

function isLegacyLineMarks(marks) {
  return Array.isArray(marks) && marks.length > 0 && typeof marks[0] === "string";
}

export function mergeMarks(marks) {
  const sorted = [...marks]
    .filter((mark) => mark && mark.end > mark.start && isVoice(mark.voice))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const mark of sorted) {
    const previous = merged[merged.length - 1];
    const start = previous ? Math.max(mark.start, previous.end) : mark.start;
    if (mark.end <= start) continue;
    if (previous && previous.voice === mark.voice && previous.end === start) {
      previous.end = mark.end;
    } else {
      merged.push({ start, end: mark.end, voice: mark.voice });
    }
  }
  return merged;
}

/** Converte marcação antiga por linha, ou intervalos, em intervalos válidos. */
export function marksFrom(text, marks) {
  const raw = String(text ?? "").replace(/\r\n/g, "\n");
  if (isLegacyLineMarks(marks)) {
    const lines = raw.split("\n");
    const ranges = [];
    let offset = 0;
    lines.forEach((line, index) => {
      const voice = marks[index];
      if (isVoice(voice) && line.length > 0) {
        ranges.push({ start: offset, end: offset + line.length, voice });
      }
      offset += line.length + 1;
    });
    return mergeMarks(ranges);
  }
  if (!Array.isArray(marks)) return [];
  const clean = [];
  for (const mark of marks) {
    const start = Number(mark?.start);
    const end = Number(mark?.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || !isVoice(mark?.voice)) continue;
    const from = Math.max(0, start);
    const to = Math.min(raw.length, end);
    if (to > from) clean.push({ start: from, end: to, voice: mark.voice });
  }
  return mergeMarks(clean);
}

export function paintRange(marks, start, end, voice) {
  const next = [];
  for (const mark of marks) {
    if (mark.end <= start || mark.start >= end) {
      next.push(mark);
      continue;
    }
    if (mark.start < start) next.push({ ...mark, end: start });
    if (mark.end > end) next.push({ ...mark, start: end });
  }
  if (isVoice(voice)) next.push({ start, end, voice });
  return mergeMarks(next);
}

export function lineSegments(line, lineStart, marks) {
  const lineEnd = lineStart + line.length;
  const pieces = [];
  let cursor = lineStart;
  for (const mark of marks) {
    if (mark.end <= lineStart || mark.start >= lineEnd) continue;
    const from = Math.max(mark.start, lineStart);
    const to = Math.min(mark.end, lineEnd);
    if (from > cursor) {
      pieces.push({ text: line.slice(cursor - lineStart, from - lineStart), voice: "" });
    }
    if (to > from) {
      pieces.push({ text: line.slice(from - lineStart, to - lineStart), voice: mark.voice });
    }
    cursor = Math.max(cursor, to);
  }
  if (cursor < lineEnd) pieces.push({ text: line.slice(cursor - lineStart), voice: "" });
  return pieces.filter((piece) => piece.text);
}

/** Tira linhas vazias das pontas e desloca os intervalos junto com o texto. */
export function packLyrics(text, marks) {
  const raw = String(text ?? "").replace(/\r\n/g, "\n");
  const ranges = marksFrom(raw, marks);
  const lines = raw.split("\n");
  let startLine = 0;
  let endLine = lines.length;
  while (startLine < endLine && !lines[startLine].trim()) startLine += 1;
  while (endLine > startLine && !lines[endLine - 1].trim()) endLine -= 1;
  let skip = 0;
  for (let index = 0; index < startLine; index += 1) skip += lines[index].length + 1;
  const kept = lines.slice(startLine, endLine).join("\n");
  const shifted = ranges
    .map((mark) => ({
      start: mark.start - skip,
      end: mark.end - skip,
      voice: mark.voice,
    }))
    .map((mark) => ({
      start: Math.max(0, mark.start),
      end: Math.min(kept.length, mark.end),
      voice: mark.voice,
    }))
    .filter((mark) => mark.end > mark.start);
  return { text: kept, marks: mergeMarks(shifted) };
}

export function hasMarkedVoices(marks) {
  if (!Array.isArray(marks)) return false;
  return marks.some((mark) => (typeof mark === "string" ? isVoice(mark) : isVoice(mark?.voice)));
}

export function songHasVoices(song) {
  return hasMarkedVoices(song?.vozesLetra) || hasMarkedVoices(song?.vozesRefrao);
}

export function stanzasOf(text, marks) {
  const raw = String(text ?? "").replace(/\r\n/g, "\n");
  const ranges = marksFrom(raw, marks);
  const lines = raw ? raw.split("\n") : [];
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start += 1;
  while (end > start && !lines[end - 1].trim()) end -= 1;
  let offset = 0;
  for (let index = 0; index < start; index += 1) offset += lines[index].length + 1;
  const stanzas = [];
  let current = [];
  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      if (current.length) stanzas.push(current);
      current = [];
    } else {
      current.push({ text: line, segments: lineSegments(line, offset, ranges) });
    }
    offset += line.length + 1;
  }
  if (current.length) stanzas.push(current);
  return stanzas;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderLyricHtml(text, marks) {
  const raw = String(text ?? "").replace(/\r\n/g, "\n");
  const ranges = marksFrom(raw, marks);
  if (!raw) return "";
  let html = "";
  let cursor = 0;
  for (const mark of ranges) {
    if (mark.start > cursor) html += escapeHtml(raw.slice(cursor, mark.start));
    const cls = mark.voice === VOICE_HOMENS ? "text-cl-voice-men" : "text-cl-voice-women";
    html += `<span data-voice="${mark.voice}" class="${cls}">${escapeHtml(raw.slice(mark.start, mark.end))}</span>`;
    cursor = mark.end;
  }
  if (cursor < raw.length) html += escapeHtml(raw.slice(cursor));
  return html;
}

export function readShowVoices() {
  try {
    const raw = localStorage.getItem(SHOW_KEY);
    if (raw == null || raw === "") return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function writeShowVoices(show) {
  try {
    localStorage.setItem(SHOW_KEY, show ? "1" : "0");
  } catch {
    /* ignore */
  }
}

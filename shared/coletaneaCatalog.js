export function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function compareTitles(a, b) {
  const byTitle = String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "pt-BR", {
    sensitivity: "base",
    numeric: true,
  });
  if (byTitle) return byTitle;
  return Number(a.id) - Number(b.id);
}

/** O número é a posição do título na coletânea, não um valor gravado na música. */
export function withNumbers(songs) {
  return [...songs]
    .sort(compareTitles)
    .map((song, index) => ({ ...song, numero: index + 1 }));
}

export function splitLabels(value) {
  return String(value ?? "")
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function groupSongs(songs, pick) {
  const groups = new Map();
  for (const song of withNumbers(songs)) {
    for (const label of pick(song)) {
      const key = fold(label);
      if (!key) continue;
      const current = groups.get(key);
      if (current) current.songs.push(song);
      else groups.set(key, { label, songs: [song] });
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
  );
}

export function filterSongs(songs, query) {
  const raw = query.trim();
  const q = fold(raw);
  const numbered = withNumbers(songs);
  if (!q) return numbered;
  return numbered.filter((song) => songMatches(song, raw, q));
}

function songMatches(song, raw, q) {
  const numero = String(song.numero ?? "");
  const padded = numero.padStart(3, "0");
  const texto = fold(`${song.titulo ?? ""}\n${song.letra ?? ""}\n${song.refrao ?? ""}`);
  return numero.includes(raw) || padded.includes(raw) || texto.includes(q);
}

function foldMap(value) {
  const raw = String(value ?? "");
  let folded = "";
  const origin = [];
  let offset = 0;
  for (const char of raw) {
    const piece = fold(char);
    for (let index = 0; index < piece.length; index += 1) origin.push(offset);
    folded += piece;
    offset += char.length;
  }
  return { raw, folded, origin };
}

function tighten(value) {
  return value.replace(/\s+/g, " ");
}

/** Trecho da letra ou do refrão em que a busca aparece. */
export function lyricExcerpt(song, query) {
  const q = fold(String(query ?? "").trim());
  if (!q) return null;
  for (const source of [song?.letra, song?.refrao]) {
    const { raw, folded, origin } = foldMap(source);
    const at = folded.indexOf(q);
    if (at < 0) continue;
    const from = origin[at];
    const to = origin[at + q.length] ?? raw.length;
    const windowStart = Math.max(0, from - 18);
    const windowEnd = Math.min(raw.length, to + 42);
    const before = tighten(raw.slice(windowStart, from)).trimStart();
    const match = tighten(raw.slice(from, to));
    const after = tighten(raw.slice(to, windowEnd)).trimEnd();
    return {
      before: `${windowStart > 0 ? "…" : ""}${before}`,
      match,
      after: `${after}${windowEnd < raw.length ? "…" : ""}`,
    };
  }
  return null;
}

const FONT_KEY = "coletanea-font-size";
const FONT_MIN = 16;
const FONT_MAX = 28;
const FONT_DEFAULT = 18;

export function readFontSize() {
  const raw = localStorage.getItem(FONT_KEY);
  const stored = Number(raw);
  if (raw == null || raw === "" || !Number.isFinite(stored)) return FONT_DEFAULT;
  return Math.min(FONT_MAX, Math.max(FONT_MIN, stored));
}

export function writeFontSize(size) {
  localStorage.setItem(FONT_KEY, String(size));
}

export const fontLimits = { min: FONT_MIN, max: FONT_MAX };

const CHRONO_KEY = "coletanea-cronologica";

export function readShowChronological() {
  try {
    const raw = localStorage.getItem(CHRONO_KEY);
    if (raw == null || raw === "") return false;
    return raw === "1";
  } catch {
    return false;
  }
}

export function writeShowChronological(show) {
  try {
    localStorage.setItem(CHRONO_KEY, show ? "1" : "0");
  } catch {
    /* ignore */
  }
}

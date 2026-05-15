/**
 * Helpers de logging coloridos para a consola do servidor.
 *
 * Usa códigos ANSI sem dependências externas. Detecta se a saída é um TTY
 * (e respeita `NO_COLOR` e `FORCE_COLOR`) — em ambientes sem suporte a cor,
 * devolve as strings inalteradas para manter os logs legíveis.
 */

const FORCE_COLOR =
  typeof process.env.FORCE_COLOR === "string" &&
  ["1", "true", "yes", "on"].includes(
    process.env.FORCE_COLOR.trim().toLowerCase(),
  );

const NO_COLOR = (() => {
  const v = process.env.NO_COLOR;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "" ? false : ["1", "true", "yes", "on"].includes(s);
})();

const COLOR_ENABLED = (() => {
  if (NO_COLOR) return false;
  if (FORCE_COLOR) return true;
  if (process.stdout && process.stdout.isTTY) return true;
  /**
   * `concurrently` redirige a saída para um pipe, mas anuncia o termo em
   * `FORCE_COLOR=1`. Ainda assim, vamos por defeito habilitar cor quando o
   * processo é executado por `concurrently` (define `npm_lifecycle_event`).
   */
  if (process.env.npm_lifecycle_event) return true;
  return false;
})();

const CODES = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  italic: "\u001b[3m",
  underline: "\u001b[4m",
  inverse: "\u001b[7m",
  black: "\u001b[30m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  white: "\u001b[37m",
  gray: "\u001b[90m",
  brightRed: "\u001b[91m",
  brightGreen: "\u001b[92m",
  brightYellow: "\u001b[93m",
  brightBlue: "\u001b[94m",
  brightMagenta: "\u001b[95m",
  brightCyan: "\u001b[96m",
  bgBlack: "\u001b[40m",
  bgRed: "\u001b[41m",
  bgGreen: "\u001b[42m",
  bgYellow: "\u001b[43m",
  bgBlue: "\u001b[44m",
  bgMagenta: "\u001b[45m",
  bgCyan: "\u001b[46m",
  bgWhite: "\u001b[47m",
};

/** Aplica um conjunto de estilos a um texto se cor estiver ativa. */
function paint(styles, text) {
  if (!COLOR_ENABLED) return text;
  const open = styles.map((s) => CODES[s] || "").join("");
  return `${open}${text}${CODES.reset}`;
}

export const color = {
  /** Forçado a string para evitar surpresas com números/booleanos. */
  apply(styles, text) {
    return paint(Array.isArray(styles) ? styles : [styles], String(text));
  },
  bold: (t) => paint(["bold"], String(t)),
  dim: (t) => paint(["dim"], String(t)),
  italic: (t) => paint(["italic"], String(t)),
  red: (t) => paint(["red"], String(t)),
  green: (t) => paint(["green"], String(t)),
  yellow: (t) => paint(["yellow"], String(t)),
  blue: (t) => paint(["blue"], String(t)),
  magenta: (t) => paint(["magenta"], String(t)),
  cyan: (t) => paint(["cyan"], String(t)),
  gray: (t) => paint(["gray"], String(t)),
  brightRed: (t) => paint(["brightRed"], String(t)),
  brightGreen: (t) => paint(["brightGreen"], String(t)),
  brightYellow: (t) => paint(["brightYellow"], String(t)),
  brightCyan: (t) => paint(["brightCyan"], String(t)),
  brightMagenta: (t) => paint(["brightMagenta"], String(t)),
};

/** Prefixo «ICER» em magenta/negrito — destaque institucional. */
const PREFIX = paint(["bold", "brightMagenta"], "[ICER]");

/** Timestamp curto (HH:MM:SS) em cinza-claro para contextualizar a linha. */
function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return paint(["dim"], `${hh}:${mm}:${ss}`);
}

/**
 * Diferentes etiquetas — cada uma tem cor e símbolo próprios para varrer
 * rapidamente a consola e identificar o tipo de mensagem.
 */
const BADGES = {
  info: paint(["bold", "brightCyan"], "ℹ INFO   "),
  success: paint(["bold", "brightGreen"], "✔ OK     "),
  warn: paint(["bold", "brightYellow"], "⚠ WARN   "),
  error: paint(["bold", "brightRed"], "✖ ERROR  "),
  debug: paint(["bold", "magenta"], "● DEBUG  "),
  banner: paint(["bold", "brightMagenta"], "✦ ICER   "),
};

function emit(stream, badge, parts) {
  /* eslint-disable no-console */
  const line = `${timestamp()} ${badge} ${PREFIX}`;
  if (stream === "err") {
    console.error(line, ...parts);
  } else {
    console.log(line, ...parts);
  }
  /* eslint-enable no-console */
}

export const log = {
  info: (...parts) => emit("out", BADGES.info, parts),
  success: (...parts) => emit("out", BADGES.success, parts),
  warn: (...parts) => emit("err", BADGES.warn, parts),
  error: (...parts) => emit("err", BADGES.error, parts),
  debug: (...parts) => emit("out", BADGES.debug, parts),
  banner: (...parts) => emit("out", BADGES.banner, parts),
  /** Linha sem prefixo, ideal para arte ASCII / réguas separadoras. */
  raw: (text = "") => {
    // eslint-disable-next-line no-console
    console.log(text);
  },
};

/** Lê o estado de cor — útil para o módulo decidir incluir/omitir códigos. */
export const colorEnabled = COLOR_ENABLED;

/**
 * Coloriza o código HTTP de acordo com a faixa:
 *  - 2xx verde, 3xx ciano, 4xx amarelo, 5xx vermelho.
 */
export function colorizeStatus(code) {
  const n = Number(code);
  if (!Number.isFinite(n)) return String(code);
  if (n >= 500) return paint(["bold", "brightRed"], String(n));
  if (n >= 400) return paint(["bold", "brightYellow"], String(n));
  if (n >= 300) return paint(["bold", "brightCyan"], String(n));
  if (n >= 200) return paint(["bold", "brightGreen"], String(n));
  return paint(["dim"], String(n));
}

/**
 * Coloriza um método HTTP — cada verbo tem cor distinta para varrer
 * rapidamente uma lista de pedidos.
 */
export function colorizeMethod(method) {
  const m = String(method || "").toUpperCase().padEnd(6, " ");
  if (m.trim() === "GET") return paint(["bold", "cyan"], m);
  if (m.trim() === "POST") return paint(["bold", "green"], m);
  if (m.trim() === "PUT") return paint(["bold", "yellow"], m);
  if (m.trim() === "PATCH") return paint(["bold", "yellow"], m);
  if (m.trim() === "DELETE") return paint(["bold", "red"], m);
  if (m.trim() === "OPTIONS") return paint(["dim"], m);
  if (m.trim() === "HEAD") return paint(["dim"], m);
  return paint(["bold"], m);
}

/**
 * Coloriza uma duração em milissegundos: verde (≤100), amarelo (≤500), vermelho (>500).
 */
export function colorizeDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return String(ms);
  const text = `${n.toFixed(1)}ms`.padStart(8, " ");
  if (n <= 100) return paint(["green"], text);
  if (n <= 500) return paint(["yellow"], text);
  return paint(["brightRed"], text);
}

/**
 * Middleware Express que emite uma linha por pedido com método/rota/status/tempo
 * coloridos. Filtra pedidos a ficheiros estáticos e assets para reduzir ruído.
 */
export function httpAccessLogger(options = {}) {
  const skipPaths = options.skipPaths || [
    "/health",
    "/api/health",
    "/favicon.ico",
  ];
  const skipPrefixes = options.skipPrefixes || ["/assets/"];
  return function accessLog(req, res, next) {
    const url = req.originalUrl || req.url || "";
    if (skipPaths.includes(url)) return next();
    if (skipPrefixes.some((p) => url.startsWith(p))) return next();
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const dur = Number(process.hrtime.bigint() - start) / 1e6;
      const method = colorizeMethod(req.method);
      const status = colorizeStatus(res.statusCode);
      const duration = colorizeDuration(dur);
      const route = color.bold(url);
      const ipRaw = req.ip || req.socket?.remoteAddress || "—";
      const ip = color.dim(`(${ipRaw})`);
      // eslint-disable-next-line no-console
      console.log(
        `${timestamp()} ${BADGES.info} ${PREFIX} ${method} ${status} ${duration}  ${route} ${ip}`,
      );
    });
    next();
  };
}

export default log;

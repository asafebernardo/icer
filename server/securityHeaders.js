import helmet from "helmet";
import { envBoolTrue } from "./envFlags.js";

/** Impede que o site seja embutido em iframes de outros domínios (clickjacking). */
const CLICKJACKING_FRAME_ANCESTORS = ["'none'"];

/**
 * Middleware Express: CSP, HSTS (produção), anti-clickjacking, nosniff, etc.
 * Desligar CSP: `ICER_CSP_DISABLE=true` (ex.: depuração local com `npm start`).
 * O cabeçalho `X-Frame-Options: DENY` mantém-se mesmo com CSP desligada.
 */
export function createSecurityHeadersMiddleware() {
  const cspDisabled = envBoolTrue("ICER_CSP_DISABLE");
  const isProd = process.env.NODE_ENV === "production";

  return helmet({
    xFrameOptions: { action: "deny" },
    contentSecurityPolicy: cspDisabled
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "https://www.youtube.com",
              "https://www.google.com",
              "https://www.gstatic.com",
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: [
              "'self'",
              "data:",
              "blob:",
              "https://images.unsplash.com",
              "https://img.youtube.com",
              "https://icons.duckduckgo.com",
              "https://www.google.com",
              "https://www.gstatic.com",
            ],
            connectSrc: ["'self'", "https://www.google.com", "https://www.recaptcha.net"],
            mediaSrc: ["'self'", "blob:", "data:"],
            frameSrc: [
              "'self'",
              "https://www.youtube.com",
              "https://www.youtube-nocookie.com",
              "https://www.google.com",
              "https://www.recaptcha.net",
              "https://recaptcha.google.com",
            ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: CLICKJACKING_FRAME_ANCESTORS,
            ...(isProd ? { upgradeInsecureRequests: [] } : {}),
          },
        },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}
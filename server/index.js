import path from "node:path";
import dotenv from "dotenv";

import { openDb } from "./db.js";
import { hashPassword } from "./auth.js";
import { nowIso } from "./security.js";
import { createApplication } from "./createApp.js";
import { nextSeq } from "./sequences.js";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
// Sobrescreve chaves de `.env` (igual ao Vite): credenciais só em `.env.local` passam a valer.
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const PORT = Number(process.env.PORT || process.env.ICER_SERVER_PORT || 3001);
const UPLOAD_DIR = process.env.ICER_UPLOAD_DIR
  ? path.resolve(process.env.ICER_UPLOAD_DIR)
  : path.resolve("server", "uploads");

let db;
try {
  // eslint-disable-next-line no-console
  console.log("[ICER] Connecting to MongoDB…");
  db = await openDb();
  // eslint-disable-next-line no-console
  console.log("[ICER] MongoDB connected");
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[ICER] MongoDB connection failed");
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
}

const MIN_PASSWORD_LEN = 10;

/**
 * Cria conta no MongoDB se o e-mail ainda não existir (login no site).
 * @param {{ email: string; full_name: string; password: string; role: "admin" | "user"; label: string }} p
 */
async function ensureUserSeed(p) {
  const email = String(p.email || "").toLowerCase().trim();
  const full_name = String(p.full_name || "").trim();
  const password = String(p.password || "");
  if (!email || !full_name || !password) {
    return;
  }
  if (password.length < MIN_PASSWORD_LEN) {
    // eslint-disable-next-line no-console
    console.warn(
      `[ICER] Seed ignorado (${p.label}): palavra-passe precisa de pelo menos ${MIN_PASSWORD_LEN} caracteres.`,
    );
    return;
  }
  const existing = await db.collection("users").findOne({ email }, { projection: { id: 1 } });
  if (existing) {
    return;
  }
  const password_hash = await hashPassword(password);
  const now = nowIso();
  const id = await nextSeq(db, "users");
  await db.collection("users").insertOne({
    id,
    email,
    full_name,
    role: p.role,
    funcao: "",
    password_hash,
    created_at: now,
    updated_at: now,
  });
  // eslint-disable-next-line no-console
  console.log(`[ICER] Conta seed (${p.role}): ${email}`);
}

async function ensureSeedUsers() {
  await ensureUserSeed({
    label: "admin",
    email: process.env.ICER_ADMIN_EMAIL,
    full_name: process.env.ICER_ADMIN_FULL_NAME,
    password: process.env.ICER_ADMIN_PASSWORD,
    role: "admin",
  });
  await ensureUserSeed({
    label: "utilizador",
    email: process.env.ICER_USER_EMAIL,
    full_name: process.env.ICER_USER_FULL_NAME,
    password: process.env.ICER_USER_PASSWORD,
    role: "user",
  });
}

await ensureSeedUsers();

const enableUpstreamProxy = Boolean(
  process.env.ICER_UPSTREAM_API ||
    process.env.VITE_APP_BASE_URL,
);

const app = createApplication(db, {
  uploadDir: UPLOAD_DIR,
  enableUpstreamProxy,
  loginRateLimit: true,
});

/**
 * Em Docker / EasyPanel o proxy liga ao container pela rede; escutar só em
 * 127.0.0.1 impede conexões externas e o healthcheck mata o processo (SIGTERM).
 */
function resolveListenHost() {
  const explicit = String(process.env.HOST || "").trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return "0.0.0.0";
  if (process.env.PORT != null && String(process.env.PORT).trim() !== "") {
    return "0.0.0.0";
  }
  if (
    process.env.ICER_SERVER_PORT != null &&
    String(process.env.ICER_SERVER_PORT).trim() !== ""
  ) {
    return "0.0.0.0";
  }
  return "127.0.0.1";
}

const HOST = resolveListenHost();

const server = app.listen(PORT, HOST, () => {
  const scheme = "http";
  const advertisedHost =
    HOST === "0.0.0.0"
      ? process.env.PUBLIC_HOST || "localhost"
      : HOST || "localhost";
  const baseUrl = `${scheme}://${advertisedHost}:${PORT}`;
  const env = process.env.NODE_ENV || "development";
  const dbName =
    String(
      process.env.MONGODB_DB_NAME || process.env.MONGODB_SRV_DATABASE || "icer",
    ).trim() || "icer";
  // eslint-disable-next-line no-console
  console.log(`[ICER] API server on http://${HOST}:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      "============================================================",
      " ICER — Startup checklist",
      "============================================================",
      ` ENV: ${env}`,
      ` MongoDB: connected (db=${dbName})`,
      ` Upload dir: ${UPLOAD_DIR}`,
      "",
      " API endpoints (should return 200):",
      `  - ${baseUrl}/health        -> ok`,
      `  - ${baseUrl}/api/health    -> { ok: true }`,
      "",
      " Next steps:",
      "  - Open the site (Front) and login",
      "  - Go to /Dashboard -> admin tabs (if admin on server)",
      "============================================================",
      "",
    ].join("\n"),
  );
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[ICER] ${signal} received — shutting down`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

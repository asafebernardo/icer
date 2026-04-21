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

const db = await openDb();

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

const HOST = String(process.env.HOST || "127.0.0.1").trim() || "127.0.0.1";

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[ICER] API server on http://${HOST}:${PORT}`);
});

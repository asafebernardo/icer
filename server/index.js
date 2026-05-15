import path from "node:path";
import dotenv from "dotenv";

import { openDb } from "./db.js";
import { hashPassword } from "./auth.js";
import { nowIso } from "./security.js";
import { createApplication } from "./createApp.js";
import { nextSeq } from "./sequences.js";

dotenv.config();

const PORT = Number(process.env.PORT || process.env.ICER_SERVER_PORT || 3001);
const UPLOAD_DIR = path.resolve("server", "private_uploads");

const db = await openDb();

async function ensureAdminSeed() {
  const email = String(process.env.ICER_ADMIN_EMAIL || "").toLowerCase().trim();
  const full_name = String(process.env.ICER_ADMIN_FULL_NAME || "").trim();
  const password = String(process.env.ICER_ADMIN_PASSWORD || "");
  if (!email || !full_name || !password) {
    return;
  }
  const existing = await db.collection("users").findOne({ email }, { projection: { id: 1 } });
  if (existing) return;
  const password_hash = await hashPassword(password);
  const now = nowIso();
  const id = await nextSeq(db, "users");
  await db.collection("users").insertOne({
    id,
    email,
    full_name,
    role: "admin",
    funcao: "",
    password_hash,
    created_at: now,
    updated_at: now,
  });
  // eslint-disable-next-line no-console
  console.log(`[ICER] Admin seed criado: ${email}`);
}

await ensureAdminSeed();

const enableUpstreamProxy = Boolean(
  process.env.ICER_UPSTREAM_API ||
    process.env.VITE_APP_BASE_URL ||
    process.env.VITE_BASE44_APP_BASE_URL,
);

const app = createApplication(db, {
  uploadDir: UPLOAD_DIR,
  enableUpstreamProxy,
  loginRateLimit: true,
});

app.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`[ICER] API server on http://127.0.0.1:${PORT}`);
});

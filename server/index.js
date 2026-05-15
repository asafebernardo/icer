import path from "node:path";
import dotenv from "dotenv";

import { openDb } from "./db.js";
import { hashPassword } from "./auth.js";
import { nowIso } from "./security.js";
import { createApplication } from "./createApp.js";
import { nextSeq } from "./sequences.js";
import { validateAccountPassword } from "./passwordPolicy.js";
import {
  BUILTIN_ADMIN_GROUP_SLUG,
  defaultGroupPermissionsMap,
} from "./permissionGroupDefaults.js";
import { log, color } from "./log.js";

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
  log.info(color.cyan("A ligar ao MongoDB…"));
  db = await openDb();
  log.success(color.brightGreen("MongoDB ligado"));
} catch (err) {
  log.error(color.brightRed("Falha ao ligar ao MongoDB"));
  log.error(err);
  process.exit(1);
}

/** Garante que todas as contas são administradores (modelo único). */
async function migrateAllUsersToAdminRole() {
  const now = nowIso();
  const r = await db.collection("users").updateMany(
    { role: { $ne: "admin" } },
    { $set: { role: "admin", updated_at: now } },
  );
  if (r.modifiedCount > 0) {
    log.info(
      `Migração: ${color.brightYellow(String(r.modifiedCount))} conta(s) passaram a role ${color.bold(
        "admin",
      )}.`,
    );
  }
}

/**
 * Cria conta no MongoDB se o e-mail ainda não existir (login no site).
 * @param {{ email: string; full_name: string; password: string; role: "admin"; label: string }} p
 */
async function ensureUserSeed(p) {
  const email = String(p.email || "").toLowerCase().trim();
  const full_name = String(p.full_name || "").trim();
  const password = String(p.password || "");
  if (!email || !full_name || !password) {
    return;
  }
  const existing = await db.collection("users").findOne({ email }, { projection: { id: 1 } });
  const isEnvSeed =
    email === String(process.env.ICER_ADMIN_EMAIL || "").toLowerCase().trim() ||
    email === String(process.env.ICER_USER_EMAIL || "").toLowerCase().trim();
  // Para as contas seed do `.env`, manter a palavra-passe sempre sincronizada
  // (facilita recuperação/acesso mesmo se o utilizador já existir).
  if (!isEnvSeed) {
    const policy = validateAccountPassword(password);
    if (!policy.ok) {
      log.warn(
        `Seed ignorado (${color.bold(p.label)}): palavra-passe não cumpre a política (${color.brightRed(
          policy.code,
        )}).`,
      );
      return;
    }
    if (existing) {
      return;
    }
  }
  const password_hash = await hashPassword(password);
  const now = nowIso();
  if (existing?.id) {
    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          full_name,
          role: p.role,
          funcao: "",
          password_hash,
          disabled: false,
          updated_at: now,
        },
      },
    );
    log.success(
      `Conta seed atualizada (${color.bold(p.label)}): ${color.brightCyan(email)}`,
    );
  } else {
    const id = await nextSeq(db, "users");
    await db.collection("users").insertOne({
      id,
      email,
      full_name,
      role: p.role,
      funcao: "",
      password_hash,
      disabled: false,
      created_at: now,
      updated_at: now,
    });
    log.success(
      `Conta seed criada (${color.bold(p.label)}): ${color.brightCyan(email)}`,
    );
  }
}

async function ensureBuiltinAdminPermissionGroup() {
  const coll = db.collection("permission_groups");
  const existing = await coll.findOne({ slug: BUILTIN_ADMIN_GROUP_SLUG });
  if (existing) return;
  const now = nowIso();
  const id = await nextSeq(db, "permission_groups");
  await coll.insertOne({
    id,
    slug: BUILTIN_ADMIN_GROUP_SLUG,
    name: "Admin",
    description:
      "Grupo predefinido com todas as permissões de menus (criar, editar e apagar). Não pode ser eliminado.",
    permissions: defaultGroupPermissionsMap(),
    created_at: now,
    updated_at: now,
  });
  log.success(
    `Grupo de permissões predefinido: ${color.bold("Admin")} ${color.dim(`(id=${id})`)}`,
  );
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
    label: "admin (segunda conta)",
    email: process.env.ICER_USER_EMAIL,
    full_name: process.env.ICER_USER_FULL_NAME,
    password: process.env.ICER_USER_PASSWORD,
    role: "admin",
  });
}

await migrateAllUsersToAdminRole();
await ensureSeedUsers();
await ensureBuiltinAdminPermissionGroup();

const enableUpstreamProxy = Boolean(
  process.env.ICER_UPSTREAM_API ||
    process.env.VITE_APP_BASE_URL,
);

/** Sessão única por conta (predefinido: ativo). `ICER_ENFORCE_SINGLE_SESSION=false` permite vários logins. */
function readBoolEnv(name, defaultValue = true) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === "") return defaultValue;
  const s = String(v).trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(s)) return false;
  return true;
}

const app = createApplication(db, {
  uploadDir: UPLOAD_DIR,
  enableUpstreamProxy,
  loginRateLimit: true,
  enforceSingleSession: readBoolEnv("ICER_ENFORCE_SINGLE_SESSION", true),
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

  log.success(
    `API server pronto em ${color.brightCyan(`http://${HOST}:${PORT}`)}`,
  );

  const envColored =
    env === "production"
      ? color.brightRed(env)
      : env === "development"
        ? color.brightGreen(env)
        : color.brightYellow(env);

  const rule = color.magenta("━".repeat(62));
  const bullet = color.brightMagenta("•");
  const arrow = color.dim("→");

  log.raw("");
  log.raw(rule);
  log.raw(
    `  ${color.bold(color.brightMagenta("✦ ICER"))} ${color.dim("—")} ${color.bold("Startup checklist")}`,
  );
  log.raw(rule);
  log.raw(`  ${bullet} ${color.bold("ENV")}        ${envColored}`);
  log.raw(
    `  ${bullet} ${color.bold("MongoDB")}    ${color.brightGreen("connected")} ${color.dim(`(db=${dbName})`)}`,
  );
  log.raw(`  ${bullet} ${color.bold("Upload dir")} ${color.cyan(UPLOAD_DIR)}`);
  log.raw("");
  log.raw(`  ${color.bold("API endpoints")} ${color.dim("(devem responder 200)")}`);
  log.raw(
    `    ${arrow} ${color.cyan(`${baseUrl}/health`)}        ${color.brightGreen("ok")}`,
  );
  log.raw(
    `    ${arrow} ${color.cyan(`${baseUrl}/api/health`)}    ${color.brightGreen("{ ok: true }")}`,
  );
  log.raw("");
  log.raw(`  ${color.bold("Próximos passos")}`);
  log.raw(`    ${arrow} Abrir o site (Front) e fazer login`);
  log.raw(
    `    ${arrow} Ir a ${color.bold("/Dashboard")} ${color.dim("→")} separadores de administração`,
  );
  log.raw(rule);
  log.raw("");
});

function shutdown(signal) {
  log.warn(
    `${color.brightYellow(signal)} recebido — a encerrar o servidor`,
  );
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

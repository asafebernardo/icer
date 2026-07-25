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
import { isHomologEnvironment, envBoolTrue } from "./envFlags.js";
import {
  getHomologSeedAccounts,
  isHomologSeedEmail,
  isHomologSeedEnabled,
} from "./homologSeed.js";
import { migratePostCategories } from "./postCategoryMigration.js";
import { seedPostExamples } from "./postExamplesSeed.js";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
// Sobrescreve chaves de `.env` (igual ao Vite): credenciais só em `.env.local` passam a valer.
dotenv.config({ path: path.join(root, ".env.local"), override: true });

if (isHomologEnvironment() || envBoolTrue("ICER_DISABLE_LOGIN_ATTEMPT_LOCK")) {
  log.info(
    color.dim(
      "Login: bloqueio por tentativas falhadas desativado (ICER_ENV homolog ou ICER_DISABLE_LOGIN_ATTEMPT_LOCK).",
    ),
  );
}

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
  const isHomologSeed = isHomologSeedEmail(email);
  // Contas seed de homologação: palavra-passe sempre sincronizada com o código/.env.
  if (!isHomologSeed) {
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
  if (!isHomologSeedEnabled()) {
    log.info(
      color.dim(
        "Contas seed de homologação inactivas (defina ICER_HOMOLOG=true para activar).",
      ),
    );
    return;
  }
  log.info(
    color.dim(
      "Contas seed de homologação activas (ICER_HOMOLOG=true) — credenciais predefinidas no código.",
    ),
  );
  for (const account of getHomologSeedAccounts()) {
    await ensureUserSeed(account);
  }
}

await migrateAllUsersToAdminRole();
await ensureSeedUsers();
if (readBoolEnv("ICER_RUN_POST_CATEGORY_MIGRATION", true)) {
  await migratePostCategories(db);
} else {
  log.info(
    color.dim(
      "Migração de categorias de posts ignorada (ICER_RUN_POST_CATEGORY_MIGRATION=false).",
    ),
  );
}

/** Posts de demonstração (mosaico /Posts) — activo em dev/homolog por omissão. */
async function ensurePostExamplesSeed() {
  const defaultOn =
    isHomologEnvironment() || String(process.env.NODE_ENV || "").trim() !== "production";
  if (!readBoolEnv("ICER_SEED_POST_EXAMPLES", defaultOn)) return;
  try {
    const result = await seedPostExamples(db);
    log.info(
      `Posts de exemplo: ${color.brightYellow(String(result.inserted))} criados, ${color.brightYellow(String(result.updated))} actualizados (${result.total} total).`,
    );
  } catch (err) {
    log.warn(
      color.dim(
        `Posts de exemplo: não foi possível gerar seed (${err?.message || err}).`,
      ),
    );
  }
}

await ensurePostExamplesSeed();
await ensureBuiltinAdminPermissionGroup();

const enableUpstreamProxy = Boolean(
  String(process.env.ICER_UPSTREAM_API || "").trim() ||
    (process.env.NODE_ENV === "production" &&
      String(process.env.VITE_APP_BASE_URL || "").trim()),
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
    `    ${arrow} Ir a ${color.bold("/Admin")} ${color.dim("→")} separadores de administração`,
  );
  log.raw(rule);
  log.raw("");
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.warn(
    `${color.brightYellow(signal)} recebido — a encerrar o servidor`,
  );
  const force = setTimeout(() => {
    log.warn("Encerramento forçado após timeout.");
    process.exit(0);
  }, 8_000);
  force.unref?.();
  server.close(() => {
    clearTimeout(force);
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

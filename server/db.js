import { MongoClient } from "mongodb";

/** @type {MongoClient | null} */
let client = null;

function resolveMongoTimeouts() {
  const serverSelectionTimeoutMS = Number(
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 8000,
  );
  const connectTimeoutMS = Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 8000);
  const socketTimeoutMS = Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 0);
  return {
    serverSelectionTimeoutMS:
      Number.isFinite(serverSelectionTimeoutMS) && serverSelectionTimeoutMS > 0
        ? serverSelectionTimeoutMS
        : 8000,
    connectTimeoutMS:
      Number.isFinite(connectTimeoutMS) && connectTimeoutMS > 0
        ? connectTimeoutMS
        : 8000,
    socketTimeoutMS:
      Number.isFinite(socketTimeoutMS) && socketTimeoutMS >= 0
        ? socketTimeoutMS
        : 0,
  };
}

/**
 * Atlas / mongodb+srv: password com @ : # / etc. → use credenciais separadas (encoding automático).
 * Aceita MONGODB_USER / MONGODB_PASSWORD ou MONGODB_SRV_USER / MONGODB_SRV_PASSWORD.
 */
function resolveMongoUri() {
  const host = String(process.env.MONGODB_SRV_HOST || "").trim();
  const user = String(
    process.env.MONGODB_USER || process.env.MONGODB_SRV_USER || "",
  ).trim();
  const pass =
    process.env.MONGODB_PASSWORD ?? process.env.MONGODB_SRV_PASSWORD;
  if (host) {
    const missing = [];
    if (!user) {
      missing.push("MONGODB_USER ou MONGODB_SRV_USER");
    }
    if (pass === undefined || String(pass).length === 0) {
      missing.push("MONGODB_PASSWORD ou MONGODB_SRV_PASSWORD");
    }
    if (missing.length) {
      throw new Error(
        `[ICER] Com MONGODB_SRV_HOST defina ${missing.join(" e ")} (ou comente MONGODB_SRV_HOST e use só MONGODB_URI).`,
      );
    }
    const u = encodeURIComponent(user);
    const p = encodeURIComponent(String(pass));
    return `mongodb+srv://${u}:${p}@${host}/?retryWrites=true&w=majority`;
  }
  return String(process.env.MONGODB_URI || "").trim();
}

/**
 * @param {import("mongodb").Db} db
 */
export async function ensureMongoIndexes(db) {
  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ token_hash: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ expires_at: 1 });
  await db.collection("user_invites").createIndex({ token_hash: 1 }, { unique: true });
  await db.collection("user_invites").createIndex({ user_id: 1, created_at: -1 });
  await db.collection("user_invites").createIndex({ expires_at: 1 });
  await db.collection("files").createIndex({ id: 1 }, { unique: true });
  await db.collection("app_kv").createIndex({ key: 1 }, { unique: true });
  await db.collection("event_bulk_runs_v1").createIndex({ id: 1 }, { unique: true });
  await db.collection("event_bulk_runs_v1").createIndex({ batch_id: 1 }, { unique: true });
  await db.collection("event_bulk_runs_v1").createIndex({ created_at: -1 });
  await db.collection("auth_2fa_challenges_v1").createIndex(
    { token_hash: 1 },
    { unique: true },
  );
  await db.collection("auth_2fa_challenges_v1").createIndex({ expires_at: 1 });
  await db.collection("auth_google_oauth_states_v1").createIndex(
    { token_hash: 1 },
    { unique: true },
  );
  await db.collection("auth_google_oauth_states_v1").createIndex({ expires_at: 1 });
  for (const c of [
    "posts",
    "eventos",
    "materiais",
    "fotos_galeria",
    "contatos",
  ]) {
    await db.collection(c).createIndex({ id: 1 }, { unique: true });
  }
  await db.collection("posts").createIndex({ created_at: 1 });
  await db.collection("eventos").createIndex({ event_date: 1, created_at: 1 });
  await db.collection("materiais").createIndex({ created_at: 1 });
  await db.collection("fotos_galeria").createIndex({ created_at: 1 });
  await db.collection("contatos").createIndex({ created_at: 1 });
  await db.collection("audit_logs").createIndex({ id: 1 }, { unique: true });
  await db.collection("audit_logs").createIndex({ user_id: 1, created_at: -1 });
  await db.collection("audit_logs").createIndex({ created_at: -1 });
}

/**
 * @param {string} uri
 * @param {string} [dbName]
 * @returns {Promise<import("mongodb").Db>}
 */
export async function openDbFromUri(uri, dbName = "icer") {
  const timeouts = resolveMongoTimeouts();
  client = new MongoClient(uri, {
    ...timeouts,
  });
  await client.connect();
  const db = client.db(dbName);
  await ensureMongoIndexes(db);
  return db;
}

/**
 * Liga a MongoDB usando `process.env.MONGODB_URI` (obrigatório).
 * @returns {Promise<import("mongodb").Db>}
 */
export async function openDb() {
  const uri = resolveMongoUri();
  if (!uri) {
    throw new Error(
      "[ICER] MongoDB: defina MONGODB_URI (ex.: mongodb://127.0.0.1:27017) ou Atlas com MONGODB_SRV_HOST + (MONGODB_USER ou MONGODB_SRV_USER) + (MONGODB_PASSWORD ou MONGODB_SRV_PASSWORD). Ver env.example.",
    );
  }
  const dbName =
    String(
      process.env.MONGODB_DB_NAME || process.env.MONGODB_SRV_DATABASE || "icer",
    ).trim() || "icer";
  return openDbFromUri(uri, dbName);
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
  }
}

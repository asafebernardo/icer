import { MongoClient } from "mongodb";

/** @type {MongoClient | null} */
let client = null;

/**
 * @param {import("mongodb").Db} db
 */
export async function ensureMongoIndexes(db) {
  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ token_hash: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ expires_at: 1 });
  await db.collection("files").createIndex({ id: 1 }, { unique: true });
  await db.collection("app_kv").createIndex({ key: 1 }, { unique: true });
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
}

/**
 * @param {string} uri
 * @param {string} [dbName]
 * @returns {Promise<import("mongodb").Db>}
 */
export async function openDbFromUri(uri, dbName = "icer") {
  client = new MongoClient(uri);
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
  const uri = String(process.env.MONGODB_URI || "").trim();
  if (!uri) {
    throw new Error(
      "[ICER] MONGODB_URI em falta. Defina no .env (ex.: mongodb://127.0.0.1:27017 ou Atlas).",
    );
  }
  const dbName = String(process.env.MONGODB_DB_NAME || "icer").trim() || "icer";
  return openDbFromUri(uri, dbName);
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
  }
}

/**
 * Copia dados de um ficheiro SQLite (ICER antigo) para MongoDB.
 *
 * Uso:
 *   node server/scripts/migrate-sqlite-to-mongo.mjs --sqlite=server/data/app.db --uri=mongodb://127.0.0.1:27017 --db=icer_import
 *
 * Requer: `better-sqlite3` (devDependency) e `mongodb`.
 * Use uma base Mongo **nova** ou vazia; chaves duplicadas falham se já existirem documentos.
 */

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import Database from "better-sqlite3";

import { ensureMongoIndexes } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

function arg(name, def = "") {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  if (p) return p.slice(name.length + 1);
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

async function setSeqMax(db, collName, maxId) {
  if (!Number.isFinite(maxId) || maxId < 1) return;
  await db.collection("_sequences").updateOne(
    { _id: collName },
    { $max: { seq: maxId } },
    { upsert: true },
  );
}

function sqliteTableExists(sqlite, name) {
  const r = sqlite
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1`,
    )
    .get(name);
  return Boolean(r?.ok);
}

async function copyTable(sqlite, db, table, mapper = (r) => r) {
  if (!sqliteTableExists(sqlite, table)) return 0;
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  if (!rows.length) return 0;
  const docs = rows.map(mapper);
  await db.collection(table).insertMany(docs, { ordered: true });
  const ids = docs.map((d) => d.id).filter((id) => Number.isFinite(id));
  if (ids.length) await setSeqMax(db, table, Math.max(...ids));
  return docs.length;
}

async function main() {
  const sqlitePath = path.resolve(ROOT, arg("--sqlite", "server/data/app.db"));
  const uri = arg("--uri", process.env.MONGODB_URI || "");
  const dbName = arg("--db", process.env.MONGODB_DB_NAME || "icer_import");
  if (!uri) {
    console.error("Indique --uri= ou MONGODB_URI.");
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const existing = await db.collection("users").estimatedDocumentCount();
  if (existing > 0) {
    console.error(
      `A base "${dbName}" já tem dados (ex.: ${existing} users). Use outro --db ou esvazie a coleção.`,
    );
    process.exit(1);
  }

  await ensureMongoIndexes(db);

  let n = 0;
  n += await copyTable(sqlite, db, "users");
  let sessionRows = [];
  if (sqliteTableExists(sqlite, "sessions")) {
    sessionRows = sqlite.prepare(`SELECT * FROM sessions`).all();
  }
  if (sessionRows.length) {
    await db.collection("sessions").insertMany(
      sessionRows.map((r) => ({
        user_id: r.user_id,
        token_hash: r.token_hash,
        created_at: r.created_at,
        expires_at: r.expires_at,
      })),
      { ordered: true },
    );
    n += sessionRows.length;
  }
  n += await copyTable(sqlite, db, "files");
  const kvRows = sqlite.prepare(`SELECT * FROM app_kv`).all();
  if (kvRows.length) {
    await db.collection("app_kv").insertMany(kvRows, { ordered: true });
    n += kvRows.length;
  }
  n += await copyTable(sqlite, db, "posts");
  n += await copyTable(sqlite, db, "eventos");
  n += await copyTable(sqlite, db, "materiais");
  n += await copyTable(sqlite, db, "fotos_galeria");
  n += await copyTable(sqlite, db, "contatos");

  sqlite.close();
  await client.close();
  console.log(`[migrate] OK: ${n} documentos (aprox.) em mongodb://${dbName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

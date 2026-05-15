import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DATA_DIR = path.resolve("server", "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function columnExists(db, table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === col);
}

export function openDb() {
  ensureDir(DATA_DIR);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

/** Base em memória para testes de integração (sem ficheiros em disco). */
export function openDbMemory() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = MEMORY");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER,
      body_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER,
      event_date TEXT NOT NULL DEFAULT '',
      body_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS materiais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER,
      body_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS fotos_galeria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER,
      body_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS contatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      body_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_eventos_date ON eventos(event_date);
    CREATE INDEX IF NOT EXISTS idx_eventos_created ON eventos(created_at);
    CREATE INDEX IF NOT EXISTS idx_materiais_created ON materiais(created_at);
    CREATE INDEX IF NOT EXISTS idx_fotos_created ON fotos_galeria(created_at);
    CREATE INDEX IF NOT EXISTS idx_contatos_created ON contatos(created_at);
  `);

  if (!columnExists(db, "users", "funcao")) {
    db.exec(`ALTER TABLE users ADD COLUMN funcao TEXT NOT NULL DEFAULT '';`);
  }
}

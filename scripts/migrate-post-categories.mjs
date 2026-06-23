/**
 * Migra categorias de posts (workspace + body_json). Idempotente.
 * Uso manual: npm run migrate:post-categories
 * Também corre automaticamente no arranque da API (`server/index.js`).
 */
import path from "node:path";
import dotenv from "dotenv";

import { openDb, closeDb } from "../server/db.js";
import { migratePostCategories } from "../server/postCategoryMigration.js";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const db = await openDb();
const result = await migratePostCategories(db);
console.log(JSON.stringify(result, null, 2));
await closeDb();
process.exit(0);

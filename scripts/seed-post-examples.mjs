/**
 * Insere posts de exemplo para testar mosaico por categoria/ano.
 * Uso: npm run seed:post-examples
 * Remover: npm run seed:post-examples -- --remove
 */
import path from "node:path";
import dotenv from "dotenv";

import { openDb, closeDb } from "../server/db.js";
import {
  removePostExamples,
  seedPostExamples,
} from "../server/postExamplesSeed.js";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const remove = process.argv.includes("--remove");

const db = await openDb();

if (remove) {
  const result = await removePostExamples(db);
  console.log(`Posts de exemplo removidos: ${result.deleted}`);
} else {
  const result = await seedPostExamples(db);
  console.log(
    `Posts de exemplo: ${result.inserted} criados, ${result.updated} actualizados (${result.total} total).`,
  );
  console.log("Abra /Posts e entre numa categoria (ex.: Natal, Culto Dominical).");
}

await closeDb();
process.exit(0);

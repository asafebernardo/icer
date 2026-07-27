/**
 * Insere posts de exemplo para testar mosaico por categoria/ano.
 * Uso: npm run seed:post-examples
 * Remover todos: npm run seed:post-examples -- --remove
 * Remover só /Eventos: npm run seed:post-examples -- --remove-eventos
 */
import path from "node:path";
import dotenv from "dotenv";

import { openDb, closeDb } from "../server/db.js";
import {
  removeEventPostExamples,
  removePostExamples,
  seedPostExamples,
} from "../server/postExamplesSeed.js";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const remove = process.argv.includes("--remove");
const removeEventos = process.argv.includes("--remove-eventos");

const db = await openDb();

if (remove) {
  const result = await removePostExamples(db);
  console.log(`Posts de exemplo removidos: ${result.deleted}`);
} else if (removeEventos) {
  const result = await removeEventPostExamples(db);
  console.log(`Posts de exemplo em /Eventos removidos: ${result.deleted}`);
} else {
  const result = await seedPostExamples(db);
  console.log(
    `Posts de exemplo: ${result.inserted} criados, ${result.updated} actualizados (${result.total} total).`,
  );
  console.log("Abra /Informacoes para ver notícias de exemplo (Eventos não recebe exemplos).");
}

await closeDb();
process.exit(0);

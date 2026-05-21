/**
 * Remove bloqueios temporários de login (coleção auth_login_failures_v1).
 * Uso: npm run clear-login-blocks
 */
import path from "node:path";
import dotenv from "dotenv";
import { openDb } from "../server/db.js";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const db = await openDb();
const r = await db.collection("auth_login_failures_v1").deleteMany({});
console.log(`Bloqueios de login removidos: ${r.deletedCount}`);
process.exit(0);

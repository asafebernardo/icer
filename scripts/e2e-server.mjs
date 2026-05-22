/**
 * Servidor E2E: API em memória + SPA (`dist/`) numa única porta.
 * Requer `npm run build` antes dos testes Playwright.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  setupTestHarness,
  getTestApp,
} from "../server/tests/testHarness.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distIndex = path.join(root, "dist", "index.html");
const PORT = Number(process.env.E2E_PORT || 3099);

if (!fs.existsSync(distIndex)) {
  process.stderr.write(
    "[e2e-server] Falta dist/index.html — execute npm run build antes dos testes E2E.\n",
  );
  process.exit(1);
}

await setupTestHarness();
const app = getTestApp();
const server = http.createServer(app);

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`[e2e-server] http://127.0.0.1:${PORT}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

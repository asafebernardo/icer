/**
 * Servidor API em memória para testes E2E (Playwright).
 * Porta padrão: 3099 (E2E_API_PORT).
 */
import http from "node:http";
import {
  setupTestHarness,
  getTestApp,
} from "../server/tests/testHarness.mjs";

const PORT = Number(process.env.E2E_API_PORT || 3099);

await setupTestHarness();
const app = getTestApp();
const server = http.createServer(app);

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`[e2e-api] http://127.0.0.1:${PORT}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

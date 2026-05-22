/**
 * Sobe API em memória + Vite para testes Playwright (um único processo).
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  setupTestHarness,
  getTestApp,
} from "../server/tests/testHarness.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const API_PORT = Number(process.env.E2E_API_PORT || 3099);
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 5174);
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");

await setupTestHarness();
const app = getTestApp();

await new Promise((resolve, reject) => {
  const server = http.createServer(app);
  server.listen(API_PORT, "127.0.0.1", () => {
    process.stdout.write(`[e2e-dev] API http://127.0.0.1:${API_PORT}\n`);
    resolve(server);
  });
  server.on("error", reject);
});

const vite = spawn(
  process.execPath,
  [viteBin, "--port", String(WEB_PORT), "--strictPort"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_USE_SERVER_AUTH: "true",
      VITE_DEV_API_URL: `http://127.0.0.1:${API_PORT}`,
    },
  },
);

function shutdown(signal) {
  if (!vite.killed) vite.kill(signal);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
vite.on("exit", (code) => process.exit(code ?? 0));

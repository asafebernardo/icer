import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_APP_BASE_URL || env.VITE_BASE44_APP_BASE_URL;
  /** Com `VITE_USE_SERVER_AUTH=true`, o Vite encaminha `/api` para o Node local (dev). */
  const serverAuth =
    env.VITE_USE_SERVER_AUTH === "true" || env.VITE_USE_SERVER_AUTH === "1";
  const localApi =
    env.VITE_DEV_API_URL ||
    `http://127.0.0.1:${env.ICER_SERVER_PORT || env.PORT || "3001"}`;

  return {
    logLevel: "error",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [react()],
    server:
      serverAuth || proxyTarget
        ? {
            proxy: {
              "/api": {
                target: serverAuth ? localApi : proxyTarget,
                changeOrigin: true,
              },
            },
          }
        : {},
  };
});

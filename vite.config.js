import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readPackageVersion() {
  const raw = readFileSync(path.join(__dirname, "package.json"), "utf8");
  return JSON.parse(raw).version ?? "0.0.0";
}

/** Curto SHA do commit atual; vazio fora de um repo Git (ex.: zip do CI sem .git). */
function readGitShortSha() {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      cwd: __dirname,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const icerSemver = readPackageVersion();
  const icerGitSha = readGitShortSha();
  const icerBuildId = icerGitSha ? `${icerSemver}+${icerGitSha}` : icerSemver;
  const proxyTarget = String(env.VITE_APP_BASE_URL || "").trim();
  /** Com `VITE_USE_SERVER_AUTH=true`, o browser usa sessão real no Node local. */
  const serverAuth =
    env.VITE_USE_SERVER_AUTH === "true" || env.VITE_USE_SERVER_AUTH === "1";
  const localApi =
    env.VITE_DEV_API_URL ||
    `http://127.0.0.1:${env.ICER_SERVER_PORT || env.PORT || "3001"}`;
  /**
   * Destino do proxy `/api`: modo servidor auth → sempre Node local; caso contrário upstream se definido.
   * Sem ambos, em `vite` dev ainda encaminhamos para o Node local para listas/admin não ficarem vazias por 404.
   */
  const apiProxyTarget = serverAuth ? localApi : proxyTarget || localApi;
  const useImplicitDevProxy =
    mode === "development" && !serverAuth && !proxyTarget;
  const shouldProxyApi = serverAuth || proxyTarget || useImplicitDevProxy;
  /** Evita 504 «Gateway Timeout» no dev quando Mongo (sessão + dados) demora (ex.: Atlas a aquecer). */
  const apiProxyTimeoutMs = Number(
    env.VITE_DEV_API_PROXY_TIMEOUT_MS || env.VITE_API_PROXY_TIMEOUT_MS || 300_000,
  );
  const proxyTimeout =
    Number.isFinite(apiProxyTimeoutMs) && apiProxyTimeoutMs > 0
      ? apiProxyTimeoutMs
      : 300_000;

  return {
    logLevel: "error",
    define: {
      "import.meta.env.VITE_ICER_SEMVER": JSON.stringify(icerSemver),
      "import.meta.env.VITE_ICER_GIT_SHA": JSON.stringify(icerGitSha || "unknown"),
      "import.meta.env.VITE_ICER_BUILD_ID": JSON.stringify(icerBuildId),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [react()],
    server: shouldProxyApi
      ? {
          proxy: {
            "/api": {
              target: apiProxyTarget,
              changeOrigin: true,
              timeout: proxyTimeout,
              proxyTimeout,
            },
          },
        }
      : {},
  };
});

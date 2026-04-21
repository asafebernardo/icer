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
  const proxyTarget = env.VITE_APP_BASE_URL || env.VITE_BASE44_APP_BASE_URL;
  /** Com `VITE_USE_SERVER_AUTH=true`, o Vite encaminha `/api` para o Node local (dev). */
  const serverAuth =
    env.VITE_USE_SERVER_AUTH === "true" || env.VITE_USE_SERVER_AUTH === "1";
  const localApi =
    env.VITE_DEV_API_URL ||
    `http://127.0.0.1:${env.ICER_SERVER_PORT || env.PORT || "3001"}`;

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

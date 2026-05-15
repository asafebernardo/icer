import fs from "node:fs";
import { execSync } from "node:child_process";

function hasGitDir() {
  try {
    return fs.existsSync(".git");
  } catch {
    return false;
  }
}

// In container/CI builds we typically don't have `.git`.
// Skip husky install to avoid noisy logs.
const disable =
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  process.env.HUSKY === "0" ||
  !hasGitDir();

if (disable) {
  process.exit(0);
}

execSync("husky", { stdio: "inherit" });


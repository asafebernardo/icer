import fs from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";

import { ADMIN_EMAIL, ADMIN_PASS } from "../server/tests/testHarness.mjs";

const API_BASE = process.env.E2E_API_URL || `http://127.0.0.1:${process.env.E2E_PORT || "3099"}`;
const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "admin.json");

export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const ctx = await request.newContext({ baseURL: API_BASE });
  await ctx.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  await ctx.storageState({ path: AUTH_FILE });
  await ctx.dispose();
}

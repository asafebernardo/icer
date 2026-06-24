import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApplication } from "../createApp.js";
import { openDbFromUri, closeDb } from "../db.js";
import { hashPassword } from "../auth.js";
import { nowIso } from "../security.js";
import { nextSeq } from "../sequences.js";

export const ADMIN_EMAIL = "admin@test.icer";
export const ADMIN_PASS = "AdminPassword12!";
export const USER_EMAIL = "user@test.icer";
export const USER_PASS = "UserPassword12!";

/** @type {import("mongodb-memory-server").MongoMemoryServer | null} */
let memoryServer = null;
/** @type {import("mongodb").Db | null} */
let db = null;
/** @type {import("express").Express | null} */
let app = null;
let uploadDir = "";

export function getTestApp() {
  if (!app) throw new Error("testHarness: call setupTestHarness() first");
  return app;
}

export function getTestDb() {
  if (!db) throw new Error("testHarness: call setupTestHarness() first");
  return db;
}

export async function setupTestHarness() {
  process.env.ICER_GITHUB_DISABLED = "1";
  process.env.ICER_ALLOW_PASSWORD_LOGIN = "1";
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  const dbName = `icer_test_${Date.now()}`;
  uploadDir = path.join(os.tmpdir(), `icer-api-test-${Date.now()}`);
  fs.mkdirSync(uploadDir, { recursive: true });
  db = await openDbFromUri(uri, dbName);

  const now = nowIso();
  const adminHash = await hashPassword(ADMIN_PASS);
  const userHash = await hashPassword(USER_PASS);
  const id1 = await nextSeq(db, "users");
  const id2 = await nextSeq(db, "users");
  await db.collection("users").insertMany([
    {
      id: id1,
      email: ADMIN_EMAIL,
      full_name: "Admin Test",
      role: "admin",
      funcao: "",
      password_hash: adminHash,
      created_at: now,
      updated_at: now,
    },
    {
      id: id2,
      email: USER_EMAIL,
      full_name: "User Test",
      role: "admin",
      funcao: "",
      password_hash: userHash,
      created_at: now,
      updated_at: now,
    },
  ]);

  app = createApplication(db, {
    uploadDir,
    enableUpstreamProxy: false,
    loginRateLimit: false,
    enforceSingleSession: false,
  });
}

export async function teardownTestHarness() {
  await closeDb();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  app = null;
  db = null;
}

/** @param {import("supertest").SuperAgentTest} agent */
export async function getCsrf(agent) {
  const r = await agent.get("/api/auth/csrf").expect(200);
  return String(r.body.csrf_token || "");
}

/** @param {import("supertest").SuperAgentTest} agent */
export async function loginAs(agent, email, password) {
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return getCsrf(agent);
}

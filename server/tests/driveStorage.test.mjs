import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  assertDriveConfigured,
  getDriveFolderId,
  getDrivePublicStatus,
  isDriveConfigured,
  isDriveStorageEnabled,
  readDriveCredentials,
  resetDriveClient,
} from "../driveStorage.js";

describe("driveStorage", () => {
  /** @type {Record<string, string | undefined>} */
  let prevEnv;

  beforeEach(() => {
    prevEnv = { ...process.env };
    delete process.env.ICER_STORAGE;
    delete process.env.ICER_FILE_STORAGE;
    delete process.env.ICER_GOOGLE_DRIVE_FOLDER_ID;
    delete process.env.ICER_GOOGLE_DRIVE_CLIENT_EMAIL;
    delete process.env.ICER_GOOGLE_DRIVE_PRIVATE_KEY;
    delete process.env.ICER_GOOGLE_DRIVE_CREDENTIALS_JSON;
    delete process.env.ICER_GOOGLE_DRIVE_CREDENTIALS_B64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    resetDriveClient();
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(prevEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetDriveClient();
  });

  it("disco local por omissão", () => {
    assert.equal(isDriveStorageEnabled(), false);
    assert.equal(isDriveConfigured(), false);
    assert.deepEqual(getDrivePublicStatus(), {
      enabled: false,
      configured: false,
      folder_configured: false,
    });
  });

  it("ICER_STORAGE=drive activa o backend", () => {
    process.env.ICER_STORAGE = "drive";
    assert.equal(isDriveStorageEnabled(), true);
  });

  it("lê email + chave com \\n escapado", () => {
    process.env.ICER_GOOGLE_DRIVE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.ICER_GOOGLE_DRIVE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n";
    process.env.ICER_GOOGLE_DRIVE_FOLDER_ID = "folder123";
    const creds = readDriveCredentials();
    assert.equal(creds.client_email, "sa@example.iam.gserviceaccount.com");
    assert.equal(creds.private_key.includes("\nABC\n"), true);
    assert.equal(getDriveFolderId(), "folder123");
    assert.equal(isDriveConfigured(), true);
  });

  it("assertDriveConfigured falha sem pasta", () => {
    process.env.ICER_STORAGE = "drive";
    process.env.ICER_GOOGLE_DRIVE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.ICER_GOOGLE_DRIVE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n";
    assert.throws(() => assertDriveConfigured(), /FOLDER_ID/);
  });
});

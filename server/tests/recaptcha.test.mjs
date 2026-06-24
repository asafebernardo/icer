import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import {
  RECAPTCHA_ACTIONS,
  createSiteAccessCookieValue,
  isRecaptchaEnforced,
  publicRecaptchaConfig,
  verifyRecaptchaToken,
  verifySiteAccessCookie,
} from "../recaptcha.js";

describe("recaptcha", () => {
  /** @type {Record<string, string | undefined>} */
  let prevEnv;

  beforeEach(() => {
    prevEnv = { ...process.env };
    delete process.env.ICER_RECAPTCHA_DISABLED;
    delete process.env.ICER_RECAPTCHA_SECRET_KEY;
    delete process.env.ICER_RECAPTCHA_SITE_KEY;
    delete process.env.VITE_RECAPTCHA_SITE_KEY;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(prevEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    mock.restoreAll();
  });

  it("publicRecaptchaConfig desligado sem chaves", () => {
    assert.deepEqual(publicRecaptchaConfig(), {
      enabled: false,
      site_key: null,
      version: null,
      enforced: false,
    });
  });

  it("verifyRecaptchaToken valida acção login", async () => {
    process.env.ICER_RECAPTCHA_SECRET_KEY = "secret";

    mock.method(globalThis, "fetch", async () => ({
      json: async () => ({
        success: true,
        score: 0.9,
        action: RECAPTCHA_ACTIONS.LOGIN,
      }),
    }));

    const r = await verifyRecaptchaToken("tok", {
      expectedAction: RECAPTCHA_ACTIONS.LOGIN,
    });
    assert.equal(r.ok, true);
  });

  it("cookie de acesso ao site assina e valida", () => {
    process.env.ICER_RECAPTCHA_SECRET_KEY = "secret";
    const { value } = createSiteAccessCookieValue();
    assert.equal(verifySiteAccessCookie(value), true);
    assert.equal(verifySiteAccessCookie("invalid"), false);
  });

  it("isRecaptchaEnforced com secret", () => {
    process.env.ICER_RECAPTCHA_SECRET_KEY = "secret";
    assert.equal(isRecaptchaEnforced(), true);
  });
});

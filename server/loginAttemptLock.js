import { nowIso } from "./security.js";
import { getHomologSeedEmails } from "./homologSeed.js";

export const LOGIN_FAIL_COLLECTION = "auth_login_failures_v1";

const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAIL_LOCK_3_MS = 15 * 60 * 1000;
const LOGIN_FAIL_LOCK_9_MS = 24 * 60 * 60 * 1000;

function parseLoginFailureExemptEmails() {
  const seeded = getHomologSeedEmails();
  const extraRaw = String(process.env.ICER_LOGIN_FAIL_EXEMPT_EMAILS || "").trim();
  const extra = extraRaw
    ? extraRaw
        .split(/[\s,;]+/)
        .map((e) => e.toLowerCase().trim())
        .filter(Boolean)
    : [];
  return new Set([...seeded, ...extra]);
}

const loginFailureExemptEmails = parseLoginFailureExemptEmails();

function isLoginFailureExemptEmail(email) {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  return loginFailureExemptEmails.has(e);
}

/**
 * @param {{ ipKey: string; userKey: string; email: string }} p
 * @returns {string[]}
 */
export function loginFailureKeys({ ipKey, userKey, email }) {
  if (isLoginFailureExemptEmail(email)) {
    return [ipKey];
  }
  return [ipKey, userKey];
}

/**
 * @param {import("mongodb").Db} db
 * @param {string[]} keys
 */
export async function readLoginBlocks(db, keys) {
  if (!keys || keys.length === 0) return [];
  const now = nowIso();
  return await db
    .collection(LOGIN_FAIL_COLLECTION)
    .find({ key: { $in: keys }, locked_until: { $gt: now } })
    .project({ _id: 0, key: 1, locked_until: 1, hard: 1, count: 1 })
    .toArray();
}

/**
 * @param {import("mongodb").Db} db
 * @param {string[]} keys
 * @param {{ hard?: boolean }} [options]
 */
export async function bumpLoginFailure(db, keys, options = {}) {
  const { hard = false } = options;
  const nowTs = Date.now();
  const now = nowIso();

  for (const key of keys) {
    if (!key) continue;
    const cur = await db
      .collection(LOGIN_FAIL_COLLECTION)
      .findOne({ key }, { projection: { _id: 0, key: 1, count: 1, first_fail_ts: 1 } });
    const freshWindow =
      !cur?.first_fail_ts || !Number.isFinite(cur.first_fail_ts)
        ? true
        : nowTs - cur.first_fail_ts > LOGIN_FAIL_WINDOW_MS;
    const nextCount = freshWindow ? 1 : Number(cur.count || 0) + 1;
    const first_fail_ts = freshWindow ? nowTs : cur.first_fail_ts;
    const $set = {
      key,
      count: nextCount,
      first_fail_ts,
      last_fail_at: now,
      updated_at: now,
    };
    let locked_until = null;
    let nextHard = hard === true;

    if (nextCount >= 9) {
      locked_until = new Date(nowTs + LOGIN_FAIL_LOCK_9_MS).toISOString();
      nextHard = true;
    } else if (nextCount >= 3) {
      locked_until = new Date(nowTs + LOGIN_FAIL_LOCK_3_MS).toISOString();
    }

    if (locked_until) $set.locked_until = locked_until;
    $set.hard = nextHard;
    await db
      .collection(LOGIN_FAIL_COLLECTION)
      .updateOne({ key }, { $set }, { upsert: true });
  }
}

/**
 * @param {import("mongodb").Db} db
 * @param {string[]} keys
 */
export async function clearLoginFailures(db, keys) {
  if (!keys || keys.length === 0) return;
  await db.collection(LOGIN_FAIL_COLLECTION).deleteMany({ key: { $in: keys } });
}

/** Requisitos de palavra-passe para contas (alinhado com `src/lib/passwordPolicy.js`). */

export const PASSWORD_MIN_LENGTH = 12;

/**
 * @param {unknown} plain
 * @returns {{ ok: true } | { ok: false; code: string }}
 */
export function validateAccountPassword(plain) {
  const s = String(plain ?? "");
  if (s.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, code: "password_too_short" };
  }
  if (!/[a-z]/.test(s)) {
    return { ok: false, code: "password_require_lowercase" };
  }
  if (!/[A-Z]/.test(s)) {
    return { ok: false, code: "password_require_uppercase" };
  }
  if (!/\d/.test(s)) {
    return { ok: false, code: "password_require_digit" };
  }
  if (!/[^A-Za-z0-9]/.test(s)) {
    return { ok: false, code: "password_require_special" };
  }
  return { ok: true };
}

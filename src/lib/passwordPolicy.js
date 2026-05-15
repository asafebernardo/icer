/** Requisitos de palavra-passe (espelho de `server/passwordPolicy.js`). */

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

/** Texto curto para formulários (PT). */
export function accountPasswordPolicyHint() {
  return `Mínimo ${PASSWORD_MIN_LENGTH} caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo (ex.: ! @ #).`;
}

/**
 * @param {string} code
 * @returns {string}
 */
export function passwordPolicyErrorMessagePt(code) {
  switch (code) {
    case "password_too_short":
      return `A palavra-passe deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    case "password_require_lowercase":
      return "Inclua pelo menos uma letra minúscula (a–z).";
    case "password_require_uppercase":
      return "Inclua pelo menos uma letra maiúscula (A–Z).";
    case "password_require_digit":
      return "Inclua pelo menos um algarismo (0–9).";
    case "password_require_special":
      return "Inclua pelo menos um símbolo (caractere que não seja só letras ou números).";
    default:
      return "A palavra-passe não cumpre os requisitos de segurança.";
  }
}

/** Códigos devolvidos pelo servidor em `message` (400). */
export function isAccountPasswordPolicyCode(code) {
  const c = String(code || "");
  return (
    c === "password_too_short" ||
    c === "password_require_lowercase" ||
    c === "password_require_uppercase" ||
    c === "password_require_digit" ||
    c === "password_require_special"
  );
}

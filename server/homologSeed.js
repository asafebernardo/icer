import { envBoolTrue } from "./envFlags.js";

/** Contas seed só existem quando `ICER_HOMOLOG=true`. */
export function isHomologSeedEnabled() {
  return envBoolTrue("ICER_HOMOLOG");
}

const HOMOLOG_SEED_DEFAULTS = Object.freeze({
  admin: {
    label: "admin",
    email: "admin@example.com",
    full_name: "Administrador",
    password: "Change-me-Min12!",
  },
  user: {
    label: "admin (segunda conta)",
    email: "user@example.com",
    full_name: "Outro administrador",
    password: "Change-me-Min12!",
  },
});

function envOrDefault(name, fallback) {
  const v = String(process.env[name] ?? "").trim();
  return v || fallback;
}

/**
 * Contas predefinidas para homologação (valores no código; `.env` pode sobrescrever).
 * @returns {Array<{ label: string; email: string; full_name: string; password: string; role: "admin" }>}
 */
export function getHomologSeedAccounts() {
  if (!isHomologSeedEnabled()) return [];

  return [
    {
      label: HOMOLOG_SEED_DEFAULTS.admin.label,
      email: envOrDefault("ICER_ADMIN_EMAIL", HOMOLOG_SEED_DEFAULTS.admin.email),
      full_name: envOrDefault(
        "ICER_ADMIN_FULL_NAME",
        HOMOLOG_SEED_DEFAULTS.admin.full_name,
      ),
      password: envOrDefault(
        "ICER_ADMIN_PASSWORD",
        HOMOLOG_SEED_DEFAULTS.admin.password,
      ),
      role: "admin",
    },
    {
      label: HOMOLOG_SEED_DEFAULTS.user.label,
      email: envOrDefault("ICER_USER_EMAIL", HOMOLOG_SEED_DEFAULTS.user.email),
      full_name: envOrDefault(
        "ICER_USER_FULL_NAME",
        HOMOLOG_SEED_DEFAULTS.user.full_name,
      ),
      password: envOrDefault(
        "ICER_USER_PASSWORD",
        HOMOLOG_SEED_DEFAULTS.user.password,
      ),
      role: "admin",
    },
  ];
}

/** E-mails das contas seed activas (homolog). */
export function getHomologSeedEmails() {
  return getHomologSeedAccounts()
    .map((a) => String(a.email || "").toLowerCase().trim())
    .filter(Boolean);
}

/** Conta seed de homologação (login de emergência, isenção de bloqueio, etc.). */
export function isHomologSeedEmail(email) {
  const e = String(email || "").toLowerCase().trim();
  if (!e || !isHomologSeedEnabled()) return false;
  return getHomologSeedEmails().includes(e);
}

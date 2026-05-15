import { hashPassword, verifyPassword } from "@/lib/passwordCrypto";

const STORAGE_KEY = "icer_local_accounts";

function readList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function findLocalAccount(email) {
  const e = String(email || "").toLowerCase().trim();
  return readList().find((a) => String(a.email || "").toLowerCase() === e) || null;
}

/**
 * @returns {Promise<{ email: string, full_name: string, role: string } | null>}
 */
export async function verifyLocalLogin(email, plainPassword) {
  const acc = findLocalAccount(email);
  if (!acc?.passwordHash || !acc?.salt) return null;
  const ok = await verifyPassword(plainPassword, acc.salt, acc.passwordHash);
  if (!ok) return null;
  return {
    email: String(acc.email).toLowerCase().trim(),
    full_name: acc.full_name || acc.email.split("@")[0],
    role: acc.role || "admin",
  };
}

/**
 * Cria ou atualiza conta local com palavra-passe derivada (PBKDF2).
 * @param {{ email: string, full_name: string, role: string, passwordPlain: string }} p
 */
export async function upsertLocalAccountWithPassword({
  email,
  full_name,
  role,
  passwordPlain,
}) {
  const e = String(email || "").toLowerCase().trim();
  const { hash, salt } = await hashPassword(passwordPlain);
  const list = readList();
  const idx = list.findIndex((a) => String(a.email || "").toLowerCase() === e);
  const row = {
    email: e,
    full_name: full_name || e.split("@")[0],
    role: role || "admin",
    passwordHash: hash,
    salt,
  };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...row };
  } else {
    list.push(row);
  }
  writeList(list);
}

/**
 * Atualiza nome e e-mail mantendo o hash existente.
 */
export function updateLocalAccountMeta(oldEmail, { email, full_name, role }) {
  const list = readList();
  const oe = String(oldEmail || "").toLowerCase().trim();
  const ne = String(email || "").toLowerCase().trim();
  const idx = list.findIndex((a) => String(a.email || "").toLowerCase() === oe);
  if (idx < 0) return;
  const cur = list[idx];
  list[idx] = {
    ...cur,
    email: ne,
    full_name: full_name ?? cur.full_name,
    role: role ?? cur.role,
  };
  writeList(list);
}

/**
 * Substitui o hash da palavra-passe para o e-mail indicado (conta local).
 */
export async function updateLocalAccountPassword(email, newPlain) {
  const e = String(email || "").toLowerCase().trim();
  const { hash, salt } = await hashPassword(newPlain);
  const list = readList();
  const idx = list.findIndex((a) => String(a.email || "").toLowerCase() === e);
  if (idx < 0) return false;
  list[idx] = { ...list[idx], passwordHash: hash, salt };
  writeList(list);
  return true;
}

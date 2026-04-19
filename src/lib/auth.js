import {
  recordMemberLogin,
  getMemberPermissions,
  getMenuPermBlock,
  permKeyForUser,
  migrateMemberStorageForEmailChange,
} from "@/lib/memberRegistry";
import {
  persistSessionUser,
  readSessionUser,
  clearSessionUser,
} from "@/lib/sessionIntegrity";
import {
  findLocalAccount,
  verifyLocalLogin,
  updateLocalAccountMeta,
  updateLocalAccountPassword,
} from "@/lib/localAccounts";
import { verifyPassword } from "@/lib/passwordCrypto";

/** Chaves dos menus (alinhadas a `SITE_MENUS` em memberRegistry). */
export const MENU = {
  HOME: "home",
  POSTAGENS: "postagens",
  RECURSOS: "recursos",
  AGENDA: "agenda",
  EVENTOS: "eventos",
  DASHBOARD: "dashboard",
  GALERIA: "galeria",
  MATERIAIS_TAB: "materiais_tab",
};

/**
 * Mapeia `pageKey` do PageHeader / fundos para o menu de permissões.
 * Chaves sem menu dedicado usam fundo/edição do menu indicado.
 */
const PAGE_KEY_TO_MENU = {
  home: MENU.HOME,
  postagens: MENU.POSTAGENS,
  agenda: MENU.AGENDA,
  eventos: MENU.EVENTOS,
  recursos: MENU.RECURSOS,
  dashboard: MENU.DASHBOARD,
  materiais: MENU.MATERIAIS_TAB,
  links: MENU.RECURSOS,
  evento: MENU.EVENTOS,
  contato: MENU.HOME,
  login: MENU.HOME,
  admin: MENU.DASHBOARD,
};

/**
 * Login local opcional (apenas desenvolvimento / demo).
 * Defina no .env: VITE_ENABLE_DEMO_LOGIN=true, VITE_DEMO_ADMIN_EMAIL, VITE_DEMO_ADMIN_PASSWORD
 * Nunca ative com palavra-passe fraca em produção.
 */
export function resolveLoginUser(email, senha) {
  const enabled = import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";
  const demoEmail = String(
    import.meta.env.VITE_DEMO_ADMIN_EMAIL || "",
  )
    .toLowerCase()
    .trim();
  const demoPass = String(import.meta.env.VITE_DEMO_ADMIN_PASSWORD || "");
  if (!enabled || !demoEmail || !demoPass) {
    return null;
  }
  const e = String(email || "").toLowerCase().trim();
  if (e === demoEmail && senha === demoPass) {
    return { email: e, role: "admin" };
  }
  return null;
}

function isDemoEmail(email) {
  const enabled = import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";
  const demoEmail = String(import.meta.env.VITE_DEMO_ADMIN_EMAIL || "")
    .toLowerCase()
    .trim();
  return (
    enabled &&
    !!demoEmail &&
    String(email || "").toLowerCase().trim() === demoEmail
  );
}

function syncLocalUsersSnapshot(oldEmail, newEmail, full_name) {
  try {
    const raw = localStorage.getItem("users");
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    const oe = String(oldEmail || "").toLowerCase().trim();
    const ne = String(newEmail || "").toLowerCase().trim();
    const next = list.map((u) => {
      if (String(u.email || "").toLowerCase() !== oe) return u;
      return { ...u, email: ne, full_name: full_name ?? u.full_name };
    });
    localStorage.setItem("users", JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function login(email, senha) {
  const demo = resolveLoginUser(email, senha);
  if (demo) {
    const e = demo.email;
    const full_name =
      String(import.meta.env.VITE_DEMO_ADMIN_FULL_NAME || "").trim() ||
      e.split("@")[0];
    const userData = {
      email: e,
      role: demo.role,
      full_name,
      _authSource: "demo",
    };
    persistSessionUser(userData);
    recordMemberLogin(userData);
    return true;
  }

  const local = await verifyLocalLogin(email, senha);
  if (!local) return false;
  const userData = {
    email: local.email,
    role: local.role,
    full_name: local.full_name,
    _authSource: "local",
  };
  persistSessionUser(userData);
  recordMemberLogin(userData);
  return true;
}

export function logout() {
  clearSessionUser();
  if (typeof window !== "undefined") {
    window.location.assign("/Home");
  }
}

export function getUser() {
  return readSessionUser();
}

/** Administrador: apenas `role === "admin"` em sessão verificada (ou legado sem segredo). */
export function isAdminUser(user) {
  if (!user || typeof user !== "object") return false;
  return user.role === "admin";
}

/**
 * Permissão granular por menu: criar / editar / apagar.
 * Contas `isAdminUser` têm todas as ações em todos os menus.
 */
export function canMenuAction(user, menuKey, action) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (action !== "create" && action !== "edit" && action !== "delete") {
    return false;
  }
  const perms = getMemberPermissions();
  const key = permKeyForUser(user);
  return !!getMenuPermBlock(perms, key, menuKey)[action];
}

export function pageKeyToMenuKey(pageKey) {
  if (!pageKey || typeof pageKey !== "string") return null;
  return PAGE_KEY_TO_MENU[pageKey] ?? null;
}

/** Fundo de página / cabeçalho: usa permissão «editar» do menu mapeado. */
export function canEditPageBackground(user, pageKey) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const menuKey = pageKeyToMenuKey(pageKey);
  if (!menuKey) return false;
  return canMenuAction(user, menuKey, "edit");
}

export function isAuthenticated() {
  return !!getUser();
}

/**
 * Valida a palavra-passe atual (conta demo .env ou conta local com PBKDF2).
 */
export async function verifyCurrentPassword(user, plainPassword) {
  if (plainPassword == null || plainPassword === "") return false;
  const email = String(user?.email || "").toLowerCase().trim();
  if (isDemoEmail(email)) {
    const demoPass = String(import.meta.env.VITE_DEMO_ADMIN_PASSWORD || "");
    return plainPassword === demoPass;
  }
  const acc = findLocalAccount(email);
  if (acc?.passwordHash && acc?.salt) {
    return verifyPassword(plainPassword, acc.salt, acc.passwordHash);
  }
  return false;
}

/**
 * Atualiza nome, e-mail e opcionalmente a palavra-passe (hash PBKDF2 na conta local).
 * Conta demo: só o nome em sessão; e-mail e senha vêm do .env.
 *
 * @param {{ full_name: string, email: string, currentPassword: string, newPassword?: string }} fields
 */
export async function updateUserProfile(fields) {
  const cur = readSessionUser();
  if (!cur || typeof cur !== "object") {
    throw new Error("Sessão inválida.");
  }

  const currentPassword = String(fields.currentPassword || "");
  const nextEmail = String(fields.email || "").toLowerCase().trim();
  const nextName =
    String(fields.full_name || "").trim() ||
    nextEmail.split("@")[0] || "—";
  const newPassword = fields.newPassword ? String(fields.newPassword) : "";

  if (!nextEmail) {
    throw new Error("Indique um e-mail válido.");
  }

  const ok = await verifyCurrentPassword(cur, currentPassword);
  if (!ok) {
    throw new Error("Palavra-passe atual incorreta.");
  }

  const oldEmail = String(cur.email || "").toLowerCase().trim();

  if (isDemoEmail(oldEmail)) {
    if (nextEmail !== oldEmail || newPassword.length > 0) {
      throw new Error(
        "Conta de demonstração: o e-mail e a palavra-passe estão definidos no ficheiro .env.",
      );
    }
    const next = { ...cur, full_name: nextName };
    persistSessionUser(next);
    recordMemberLogin(next);
    return next;
  }

  const localAcc = findLocalAccount(oldEmail);
  if (!localAcc) {
    throw new Error(
      "Só é possível alterar a palavra-passe para contas registadas neste navegador (login local).",
    );
  }

  if (nextEmail !== oldEmail) {
    const clash = findLocalAccount(nextEmail);
    if (clash) {
      throw new Error("Este e-mail já está registado.");
    }
    migrateMemberStorageForEmailChange(oldEmail, nextEmail, cur.id);
    syncLocalUsersSnapshot(oldEmail, nextEmail, nextName);
    updateLocalAccountMeta(oldEmail, {
      email: nextEmail,
      full_name: nextName,
      role: cur.role || localAcc.role || "user",
    });
  } else {
    updateLocalAccountMeta(oldEmail, {
      email: nextEmail,
      full_name: nextName,
      role: cur.role || localAcc.role || "user",
    });
    syncLocalUsersSnapshot(oldEmail, nextEmail, nextName);
  }

  if (newPassword.length > 0) {
    if (newPassword.length < 8) {
      throw new Error("A nova palavra-passe deve ter pelo menos 8 caracteres.");
    }
    await updateLocalAccountPassword(nextEmail, newPassword);
  }

  const next = {
    ...cur,
    email: nextEmail,
    full_name: nextName,
  };
  persistSessionUser(next);
  recordMemberLogin(next);
  return next;
}

/** Sessão da conta de demonstração (.env) — e-mail e senha não se editam na UI. */
export function isDemoAdminSession(user) {
  return isDemoEmail(user?.email);
}

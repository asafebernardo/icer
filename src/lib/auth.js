import {
  recordMemberLogin,
  getMemberPermissions,
  getMenuPermBlock,
  permKeyForUser,
} from "@/lib/memberRegistry";
import {
  persistSessionUser,
  readSessionUser,
  clearSessionUser,
} from "@/lib/sessionIntegrity";
import { fetchJson, isServerAuthEnabled } from "@/lib/serverAuth";
import {
  findLocalAccount,
  verifyLocalLogin,
  updateLocalAccountMeta,
  updateLocalAccountPassword,
} from "@/lib/localAccounts";
import { verifyPassword } from "@/lib/passwordCrypto";
import { fetchJson, isServerAuthEnabled } from "@/lib/serverAuth";

/** Mapa `menuKey` → `{ create, edit, delete }` vindo do servidor (sessão com cookie). */
let serverMenuEffective = null;

export function setServerMenuEffective(map) {
  serverMenuEffective = map && typeof map === "object" ? map : null;
}

export function clearServerMenuEffective() {
  serverMenuEffective = null;
}

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
  materiais: MENU.RECURSOS,
  links: MENU.RECURSOS,
  evento: MENU.EVENTOS,
  contato: MENU.HOME,
  login: MENU.HOME,
  admin: MENU.DASHBOARD,
};

export { isServerAuthEnabled };

async function loginWithServer(email, senha, opts = {}) {
  const body = { email, password: senha };
  if (opts?.forceNewSession === true) {
    body.force_new_session = true;
  }
  await fetchJson("/auth/login", {
    method: "POST",
    body,
  });
  const u = await fetchJson("/auth/me", { method: "GET" });
  const userData = {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    funcao: u.funcao ?? "",
    avatar_url: u.avatar_url ? String(u.avatar_url) : "",
    _authSource: "server",
  };
  persistSessionUser(userData);
  recordMemberLogin(userData);
}

export { isServerAuthEnabled };

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
  if (code === "login_unavailable") {
    return "Acesso temporariamente indisponível para esta conta/rede por excesso de tentativas. Tente novamente mais tarde.";
  }
  if (code && code !== "Error") return code;
  return "Não foi possível iniciar sessão.";
}

async function loginWithServer(email, senha) {
  await fetchJson("/auth/login", {
    method: "POST",
    body: { email, password: senha },
  });
  const u = await fetchJson("/auth/me", { method: "GET" });
  const userData = {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    funcao: u.funcao ?? "",
    _authSource: "server",
  };
  persistSessionUser(userData);
  recordMemberLogin(userData);
  return true;
}

/**
 * @param {{ forceNewSession?: boolean }} [opts]
 * @returns {Promise<
 *   | { ok: true }
 *   | { ok: false; message: string; sessionAlreadyActive?: boolean }
 * >}
 */
export async function login(email, senha, opts = {}) {
  if (!isServerAuthEnabled()) {
    return {
      ok: false,
      message:
        "Autenticação do servidor desativada. Ative `VITE_USE_SERVER_AUTH=true` para usar contas no MongoDB.",
    };
  }

  if (isServerAuthEnabled()) {
    try {
      return await loginWithServer(email, senha);
    } catch {
      /* continua para conta local no browser */
    }
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
  const cur = readSessionUser();
  if (isServerAuthEnabled() || cur?._authSource === "server") {
    void fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  }
  clearServerMenuEffective();
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
  if (isServerAuthEnabled() && user._authSource === "server") return true;
  if (isAdminUser(user)) return true;
  if (action !== "create" && action !== "edit" && action !== "delete") {
    return false;
  }
  if (
    isServerAuthEnabled() &&
    user._authSource === "server" &&
    serverMenuEffective
  ) {
    const block = serverMenuEffective[menuKey];
    if (block && block[action] === false) return false;
    return true;
  }
  const perms = getMemberPermissions();
  const key = permKeyForUser(user);
  return !!getMenuPermBlock(perms, key, menuKey)[action];
}

/** Página Recursos (materiais + links): um único menu «recursos», com legado «materiais_tab». */
export function canRecursosMenuAction(user, action) {
  return (
    canMenuAction(user, MENU.RECURSOS, action) ||
    canMenuAction(user, MENU.MATERIAIS_TAB, action)
  );
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
  if (user?._authSource === "server") {
    return false;
  }
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
 * Atualiza perfil do utilizador autenticado.
 * Em modo servidor: persiste no MongoDB via API.
 * Sessão demo: permite apenas alterar o nome em sessão.
 *
 * @param {{ full_name: string, email: string, currentPassword: string, newPassword?: string, avatar_url?: string }} fields
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

  const oldEmail = String(cur.email || "").toLowerCase().trim();

  if (cur._authSource === "server") {
    try {
      const u = await fetchJson("/users/me", {
        method: "PUT",
        body: {
          full_name: nextName,
          email: nextEmail,
          current_password: currentPassword,
          new_password: newPassword || undefined,
        },
      });
      const next = {
        ...cur,
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        _authSource: "server",
      };
      persistSessionUser(next);
      recordMemberLogin(next);
      return next;
    } catch (e) {
      throw new Error(
        e?.message === "invalid_credentials"
          ? "Palavra-passe atual incorreta."
          : e?.message || "Não foi possível atualizar o perfil.",
      );
    }
  }

  const ok = await verifyCurrentPassword(cur, currentPassword);
  if (!ok) {
    throw new Error("Palavra-passe atual incorreta.");
  }

  if (isDemoEmail(oldEmail)) {
    if (nextEmail !== oldEmail || newPassword.length > 0) {
      throw new Error(
        m === "current_password_required"
          ? "Informe a palavra-passe atual."
          : m === "password_not_set"
            ? "A sua conta ainda não tem palavra-passe. Use o link do convite para criar a sua palavra-passe."
            : m === "invalid_credentials"
              ? "Palavra-passe atual incorreta."
              : m || "Não foi possível atualizar o perfil.",
      );
    }
  }

  throw new Error(
    "Apenas contas do servidor podem ser editadas. Crie e gerencie utilizadores pelo servidor (MongoDB).",
  );
}

/** Sessão da conta de demonstração (.env) — e-mail e senha não se editam na UI. */
export function isDemoAdminSession(user) {
  return false;
}

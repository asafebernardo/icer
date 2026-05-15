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

export { isServerAuthEnabled };

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
}

/** @param {Error & { status?: number; data?: unknown }} e */
function mapServerLoginError(e) {
  const raw =
    (e?.data && typeof e.data === "object" && "message" in e.data
      ? /** @type {{ message?: string }} */ (e.data).message
      : null) || e?.message;
  const code = String(raw || "");
  if (code === "invalid_credentials") {
    return "E-mail ou palavra-passe incorrectos.";
  }
  if (code === "password_not_set") {
    return "A sua conta ainda não tem palavra-passe. Use o link do convite para criar a sua palavra-passe.";
  }
  if (code === "invalid_request") {
    return "Dados inválidos.";
  }
  if (code === "too_many_requests") {
    return "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (code && code !== "Error") return code;
  return "Não foi possível iniciar sessão.";
}

/**
 * @returns {Promise<{ ok: true } | { ok: false; message: string }>}
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
    return { ok: true };
  }

  if (!isServerAuthEnabled()) {
    return {
      ok: false,
      message:
        "Autenticação do servidor desativada. Ative `VITE_USE_SERVER_AUTH=true` para usar contas no MongoDB.",
    };
  }

  try {
    await loginWithServer(email, senha);
    return { ok: true };
  } catch (e) {
    const status = /** @type {Error & { status?: number }} */ (e)?.status;
    if (status === 401 || status === 400) {
      return {
        ok: false,
        message: mapServerLoginError(
          /** @type {Error & { status?: number; data?: unknown }} */ (e),
        ),
      };
    }
    return {
      ok: false,
      message:
        "Não foi possível validar no servidor. Confirme que o servidor está no ar (`npm run dev:server`) e o proxy/porta estão corretos.",
    };
  }
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
  return false;
}

/**
 * Atualiza perfil do utilizador autenticado.
 * Em modo servidor: persiste no MongoDB via API.
 * Sessão demo: permite apenas alterar o nome em sessão.
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

  const oldEmail = String(cur.email || "").toLowerCase().trim();

  if (isDemoEmail(oldEmail)) {
    if (nextEmail !== oldEmail || newPassword.length > 0) {
      throw new Error(
        "Conta de demonstração: o e-mail e a palavra-passe estão definidos no ficheiro .env.",
      );
    }
    const ok = await verifyCurrentPassword(cur, currentPassword);
    if (!ok) {
      throw new Error("Palavra-passe atual incorreta.");
    }
    const next = { ...cur, full_name: nextName };
    persistSessionUser(next);
    recordMemberLogin(next);
    return next;
  }

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

  throw new Error(
    "Apenas contas do servidor podem ser editadas. Crie e gerencie utilizadores pelo servidor (MongoDB).",
  );
}

/** Sessão da conta de demonstração (.env) — e-mail e senha não se editam na UI. */
export function isDemoAdminSession(user) {
  return isDemoEmail(user?.email);
}

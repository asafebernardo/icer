import {
  AlertTriangle,
  Calendar,
  FileText,
  FolderOpen,
  HardDriveDownload,
  Image as ImageIcon,
  KeyRound,
  LogIn,
  LogOut,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

export const ACTION_LABELS = {
  "auth.login": "Início de sessão",
  "auth.login_google": "Início de sessão (Google)",
  "auth.login_google_denied": "Login Google recusado (política)",
  "auth.login_google_failed": "Falha no login Google",
  "auth.login_failed": "Falha de início de sessão",
  "auth.logout": "Fim de sessão",
  "auth.sessions_revoked_by_login": "Sessões anteriores encerradas (novo login)",
  "user.profile_update": "Alteração de perfil",
  "admin.user.create": "Conta criada (admin)",
  "admin.user.update": "Conta atualizada (admin)",
  "admin.user.delete": "Conta eliminada (admin)",
  "admin.user_invite": "Convite enviado",
  "admin.user_invite_revoke": "Convite revogado",
  "admin.user_invite_resend": "Convite reenviado",
  "admin.user_invite_accept": "Convite aceite",
  "admin.google_login_config_update": "Configuração do Google (admin)",
  "admin.menu_permissions.update": "Permissões de menus (admin)",
  "admin.audit_log_retention_update": "Retenção dos registos de auditoria",
  "file.upload": "Envio de ficheiro",
  "data.menu_permissions.update": "Permissões de menus (admin)",
  "data.posts.create": "Postagem criada",
  "data.posts.update": "Postagem atualizada",
  "data.posts.delete": "Postagem eliminada",
  "data.eventos.create": "Evento criado",
  "data.eventos.update": "Evento atualizado",
  "data.eventos.delete": "Evento eliminado",
  "data.materiais.create": "Material criado",
  "data.materiais.update": "Material atualizado",
  "data.materiais.delete": "Material eliminado",
  "data.fotos_galeria.create": "Foto da galeria criada",
  "data.fotos_galeria.update": "Foto da galeria atualizada",
  "data.fotos_galeria.delete": "Foto da galeria eliminada",
};

export function labelForAction(action) {
  return ACTION_LABELS[action] || action;
}

/**
 * Categorias visuais para o registo de auditoria. Cada categoria mapeia para
 * um esquema de cores (classes Tailwind) e um ícone Lucide. Mantém-se
 * deliberadamente independente do tema (light/dark) — todas as variantes têm
 * versões em ambos os modos.
 */
const CATEGORIES = {
  auth_success: {
    label: "Sessão",
    icon: LogIn,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
    accentClass:
      "border-l-4 border-l-emerald-500/70 dark:border-l-emerald-400/60",
  },
  auth_failure: {
    label: "Sessão (falha)",
    icon: ShieldAlert,
    iconClass: "text-rose-600 dark:text-rose-400",
    badgeClass:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40",
    accentClass: "border-l-4 border-l-rose-500/70 dark:border-l-rose-400/60",
  },
  auth_logout: {
    label: "Logout",
    icon: LogOut,
    iconClass: "text-slate-600 dark:text-slate-300",
    badgeClass:
      "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40",
    accentClass: "border-l-4 border-l-slate-500/70 dark:border-l-slate-400/60",
  },
  user_create: {
    label: "Conta criada",
    icon: UserPlus,
    iconClass: "text-sky-600 dark:text-sky-400",
    badgeClass:
      "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40",
    accentClass: "border-l-4 border-l-sky-500/70 dark:border-l-sky-400/60",
  },
  user_update: {
    label: "Conta alterada",
    icon: UserCog,
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    accentClass: "border-l-4 border-l-amber-500/70 dark:border-l-amber-400/60",
  },
  user_delete: {
    label: "Conta eliminada",
    icon: UserMinus,
    iconClass: "text-red-600 dark:text-red-400",
    badgeClass:
      "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
    accentClass: "border-l-4 border-l-red-500/70 dark:border-l-red-400/60",
  },
  user_invite: {
    label: "Convite",
    icon: Users,
    iconClass: "text-indigo-600 dark:text-indigo-400",
    badgeClass:
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40",
    accentClass:
      "border-l-4 border-l-indigo-500/70 dark:border-l-indigo-400/60",
  },
  user_self: {
    label: "Perfil",
    icon: UserCog,
    iconClass: "text-teal-600 dark:text-teal-400",
    badgeClass:
      "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40",
    accentClass: "border-l-4 border-l-teal-500/70 dark:border-l-teal-400/60",
  },
  data_create: {
    label: "Criação",
    icon: FileText,
    iconClass: "text-blue-600 dark:text-blue-400",
    badgeClass:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40",
    accentClass: "border-l-4 border-l-blue-500/70 dark:border-l-blue-400/60",
  },
  data_update: {
    label: "Edição",
    icon: FileText,
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    accentClass: "border-l-4 border-l-amber-500/70 dark:border-l-amber-400/60",
  },
  data_delete: {
    label: "Eliminação",
    icon: Trash2,
    iconClass: "text-red-600 dark:text-red-400",
    badgeClass:
      "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
    accentClass: "border-l-4 border-l-red-500/70 dark:border-l-red-400/60",
  },
  event: {
    label: "Evento",
    icon: Calendar,
    iconClass: "text-fuchsia-600 dark:text-fuchsia-400",
    badgeClass:
      "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/40",
    accentClass:
      "border-l-4 border-l-fuchsia-500/70 dark:border-l-fuchsia-400/60",
  },
  material: {
    label: "Material",
    icon: FolderOpen,
    iconClass: "text-cyan-600 dark:text-cyan-400",
    badgeClass:
      "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40",
    accentClass: "border-l-4 border-l-cyan-500/70 dark:border-l-cyan-400/60",
  },
  gallery: {
    label: "Galeria",
    icon: ImageIcon,
    iconClass: "text-pink-600 dark:text-pink-400",
    badgeClass:
      "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/40",
    accentClass: "border-l-4 border-l-pink-500/70 dark:border-l-pink-400/60",
  },
  file_upload: {
    label: "Upload",
    icon: UploadCloud,
    iconClass: "text-violet-600 dark:text-violet-400",
    badgeClass:
      "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40",
    accentClass:
      "border-l-4 border-l-violet-500/70 dark:border-l-violet-400/60",
  },
  permission: {
    label: "Permissões",
    icon: ShieldCheck,
    iconClass: "text-yellow-600 dark:text-yellow-400",
    badgeClass:
      "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/40",
    accentClass:
      "border-l-4 border-l-yellow-500/70 dark:border-l-yellow-400/60",
  },
  google: {
    label: "Google",
    icon: KeyRound,
    iconClass: "text-orange-600 dark:text-orange-400",
    badgeClass:
      "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
    accentClass:
      "border-l-4 border-l-orange-500/70 dark:border-l-orange-400/60",
  },
  backup: {
    label: "Backup",
    icon: HardDriveDownload,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
    accentClass:
      "border-l-4 border-l-emerald-500/70 dark:border-l-emerald-400/60",
  },
  settings: {
    label: "Definições",
    icon: Settings,
    iconClass: "text-zinc-600 dark:text-zinc-300",
    badgeClass:
      "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/40",
    accentClass: "border-l-4 border-l-zinc-500/70 dark:border-l-zinc-400/60",
  },
  unknown: {
    label: "Outro",
    icon: AlertTriangle,
    iconClass: "text-muted-foreground",
    badgeClass:
      "bg-muted text-muted-foreground border-border",
    accentClass: "border-l-4 border-l-border",
  },
};

/**
 * Mapeamento determinístico de `action` para uma das categorias acima.
 * É mantido aqui — em vez de espalhado pela aplicação — para que adicionar uma
 * nova ação no servidor só obrigue a editar este ficheiro.
 */
export function categoryForAction(action) {
  const a = String(action || "").toLowerCase();
  if (!a) return CATEGORIES.unknown;

  if (a === "auth.logout") return CATEGORIES.auth_logout;
  if (
    a === "auth.login_failed" ||
    a === "auth.login_google_failed" ||
    a === "auth.login_google_denied"
  ) {
    return CATEGORIES.auth_failure;
  }
  if (a.startsWith("auth.")) return CATEGORIES.auth_success;

  if (a === "user.profile_update") return CATEGORIES.user_self;
  if (a.startsWith("admin.user_invite")) return CATEGORIES.user_invite;
  if (a === "admin.user.create") return CATEGORIES.user_create;
  if (a === "admin.user.update") return CATEGORIES.user_update;
  if (a === "admin.user.delete") return CATEGORIES.user_delete;
  if (a === "admin.google_login_config_update") return CATEGORIES.google;
  if (a === "admin.audit_log_retention_update") return CATEGORIES.settings;
  if (a.endsWith("menu_permissions.update")) return CATEGORIES.permission;

  if (a === "file.upload") return CATEGORIES.file_upload;

  if (a.startsWith("data.eventos.")) return CATEGORIES.event;
  if (a.startsWith("data.materiais.")) return CATEGORIES.material;
  if (a.startsWith("data.fotos_galeria.")) return CATEGORIES.gallery;

  if (a.endsWith(".delete")) return CATEGORIES.data_delete;
  if (a.endsWith(".update")) return CATEGORIES.data_update;
  if (a.endsWith(".create")) return CATEGORIES.data_create;

  return CATEGORIES.unknown;
}

/** Lista de categorias única (para legendas/filtros futuros). */
export const AUDIT_CATEGORIES = CATEGORIES;

export function formatAuditDetails(details) {
  if (details == null || typeof details !== "object") return "—";
  try {
    const s = JSON.stringify(details);
    return s.length > 220 ? `${s.slice(0, 217)}…` : s;
  } catch {
    return "—";
  }
}

/** Iniciais a partir de um nome/email para o `AvatarFallback`. */
export function initialsFromIdentity(identity) {
  if (!identity) return "?";
  const s = String(identity).trim();
  if (!s) return "?";
  if (s.includes("@")) {
    const [user] = s.split("@");
    const parts = user.split(/[._\-+\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.slice(0, 2).toUpperCase();
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

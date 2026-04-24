export const ACTION_LABELS = {
  "auth.login": "Início de sessão",
  "auth.login_failed": "Falha de início de sessão",
  "auth.logout": "Fim de sessão",
  "user.profile_update": "Alteração de perfil",
  "admin.user.create": "Conta criada (admin)",
  "admin.user.update": "Conta atualizada (admin)",
  "admin.user.delete": "Conta eliminada (admin)",
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

export function formatAuditDetails(details) {
  if (details == null || typeof details !== "object") return "—";
  try {
    const s = JSON.stringify(details);
    return s.length > 220 ? `${s.slice(0, 217)}…` : s;
  } catch {
    return "—";
  }
}

/** Mensagens PT para erros de `DELETE /api/admin/users/:id`. */
export function formatAdminUserDeleteError(raw) {
  const m = String(raw || "").trim();
  if (m === "cannot_delete_self")
    return "Não pode eliminar a sua própria conta.";
  if (m === "cannot_delete_last_admin")
    return "Tem de existir pelo menos outro administrador antes de eliminar esta conta de admin.";
  if (m === "not_found") return "Utilizador já não existe.";
  return m || "Não foi possível eliminar.";
}

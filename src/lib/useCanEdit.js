import { useEditMode } from "@/lib/EditModeContext";
import { canMenuAction } from "@/lib/auth";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";

/**
 * Hook unificado para gates de edição visual.
 *
 * Combina o "Modo de edição" (toggle do admin) com a permissão real do menu.
 * Retorna `true` apenas quando o utilizador tem permissão de `edit` para o
 * `menuKey` E o "Modo de edição" está ativo.
 *
 * Use para mostrar/ocultar lápis e botões de edição inline.
 *
 * IMPORTANTE: NÃO use este hook para autorizar mutations ou bloquear ações.
 * Para isso use `canMenuAction(user, MENU.X, "edit")` direto — o servidor
 * também valida e isto aqui é apenas affordance visual.
 */
export default function useCanEdit(menuKey) {
  const user = useSyncedAuthUser();
  const { enabled } = useEditMode();
  if (!menuKey) return false;
  const allowed = canMenuAction(user, menuKey, "edit");
  return Boolean(allowed && enabled);
}

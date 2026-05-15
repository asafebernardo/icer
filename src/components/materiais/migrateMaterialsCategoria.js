import { api } from "@/api/client";
import { SEM_CATEGORIA_ID } from "./materiaisConfig";

/**
 * Atualiza todos os materiais que usavam `removedCategoryId` para «Sem categoria».
 * @returns {Promise<number>} quantidade atualizada
 */
export async function migrateMaterialsToSemCategoria(removedCategoryId) {
  let list = [];
  try {
    list = await api.entities.Material.list("-created_date", 500);
  } catch {
    return 0;
  }
  if (!Array.isArray(list)) return 0;
  let n = 0;
  for (const m of list) {
    if (m.categoria === removedCategoryId) {
      try {
        await api.entities.Material.update(m.id, { categoria: SEM_CATEGORIA_ID });
        n += 1;
      } catch (e) {
        console.warn("migrateMaterialsToSemCategoria", m.id, e);
      }
    }
  }
  return n;
}

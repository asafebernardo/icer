import { api } from "@/api/client";

/** Lista de eventos na API. */
export async function listEventosMerged() {
  try {
    const apiList = await api.entities.Evento.list("data", 500);
    return Array.isArray(apiList) ? apiList : [];
  } catch {
    return [];
  }
}

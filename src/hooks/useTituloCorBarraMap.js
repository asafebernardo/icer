import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { DEFAULT_AGENDA_SUGESTOES } from "@/lib/agendaSugestoesDefaults";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
  mergeRemoteAgendaSugestoes,
} from "@/lib/publicWorkspace";

/**
 * Mapa título (texto exacto) → preset de barra do cartão, definido no cadastro «Títulos sugeridos».
 */
export function useTituloCorBarraMap() {
  const { data } = useQuery({
    queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
    queryFn: fetchPublicWorkspaceJson,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const merged = mergeRemoteAgendaSugestoes(
      DEFAULT_AGENDA_SUGESTOES,
      data?.agenda_sugestoes,
    );
    const m = merged.titulo_cor_barra;
    return m && typeof m === "object" ? m : {};
  }, [data?.agenda_sugestoes]);
}

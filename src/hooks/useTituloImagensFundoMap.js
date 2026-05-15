import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { DEFAULT_AGENDA_SUGESTOES } from "@/lib/agendaSugestoesDefaults";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
  mergeRemoteAgendaSugestoes,
} from "@/lib/publicWorkspace";

/**
 * Mapa título (texto exacto) → URLs de imagem de fundo do cartão.
 */
export function useTituloImagensFundoMap() {
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
    const m = merged.titulo_imagens_fundo;
    return m && typeof m === "object" && !Array.isArray(m) ? m : {};
  }, [data?.agenda_sugestoes]);
}

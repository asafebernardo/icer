import { Navigate, useSearchParams } from "react-router-dom";

import { getInformacoesAgendaPath } from "@/lib/postsNavPath";

/** Legado: `/Informacoes/categoria/eventos` → Agenda › Eventos. */
export default function PostsEventosHubPage() {
  const [searchParams] = useSearchParams();
  const tabParam = String(searchParams.get("tab") || "").trim().toLowerCase();
  const novo = searchParams.get("novo") === "1";

  if (tabParam === "agenda") {
    return <Navigate to={getInformacoesAgendaPath()} replace />;
  }

  const tab =
    tabParam === "configuracoes"
      ? "configuracoes"
      : tabParam === "eventos" || novo
        ? "eventos"
        : "eventos";

  return (
    <Navigate
      to={getInformacoesAgendaPath({ tab, novo })}
      replace
    />
  );
}

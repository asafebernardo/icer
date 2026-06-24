import { Navigate, useParams } from "react-router-dom";

import {
  INFORMACOES_HUB_PATH,
  POSTS_HUB_PATH,
} from "@/lib/postsNavPath";

const LEGACY_EVENTOS_GROUP_IDS = new Set([
  "oficiais",
  "festividade",
  "encontros",
  "especiais",
  "eventos",
]);

/** Rotas legadas `/Eventos/grupo/:grupo` → hubs actuais. */
export default function PostsGrupoPage() {
  const { grupo } = useParams();
  const groupId = String(grupo || "").trim().toLowerCase();

  if (groupId === "informacoes") {
    return <Navigate to={INFORMACOES_HUB_PATH} replace />;
  }

  if (LEGACY_EVENTOS_GROUP_IDS.has(groupId)) {
    return <Navigate to={POSTS_HUB_PATH} replace />;
  }

  return <Navigate to={POSTS_HUB_PATH} replace />;
}

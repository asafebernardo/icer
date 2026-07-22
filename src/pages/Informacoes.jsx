import { Navigate, useLocation } from "react-router-dom";

import { INFORMACOES_HUB_PATH } from "@/lib/postsNavPath";

/** Legado: o hub de Informações passou para a página Início. */
export default function Informacoes() {
  const location = useLocation();
  const hash = location.hash || "#informacoes";
  return <Navigate to={`${INFORMACOES_HUB_PATH}${hash}`} replace />;
}

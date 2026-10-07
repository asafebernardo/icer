import { Navigate, useLocation } from "react-router-dom";

import { FALE_CONOSCO_PATH, INFORMACOES_HUB_PATH } from "@/lib/postsNavPath";

/** Legado: Informações passou a Apps; #contato passou a Fale conosco. */
export default function Informacoes() {
  const location = useLocation();
  const hash = String(location.hash || "").replace(/^#/, "");
  if (hash === "contato") {
    return <Navigate to={FALE_CONOSCO_PATH} replace />;
  }
  return <Navigate to={INFORMACOES_HUB_PATH} replace />;
}

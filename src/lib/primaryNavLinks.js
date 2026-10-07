import {
  FALE_CONOSCO_LABEL,
  FALE_CONOSCO_PATH,
  INFORMACOES_HUB_LABEL,
  INFORMACOES_HUB_PATH,
  POSTS_HUB_LABEL,
  POSTS_HUB_PATH,
} from "@/lib/postsNavPath";

/** Destinos públicos principais (navbar, faixa abaixo da navbar, bottom nav). */
export const PRIMARY_NAV_LINKS = [
  { label: "Início", path: "/Home" },
  { label: "Cultos", path: "/Cultos" },
  { label: POSTS_HUB_LABEL, path: POSTS_HUB_PATH },
  { label: "História", path: "/Historia" },
  { label: INFORMACOES_HUB_LABEL, path: INFORMACOES_HUB_PATH },
  { label: FALE_CONOSCO_LABEL, path: FALE_CONOSCO_PATH },
];

/** @param {string} pathname
 *  @param {string} itemPath */
export function isPrimaryNavActive(pathname, itemPath) {
  if (itemPath === POSTS_HUB_PATH) {
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  }
  if (itemPath === INFORMACOES_HUB_PATH) {
    return pathname === itemPath || pathname.startsWith("/Informacoes/");
  }
  if (itemPath === "/Home") {
    return pathname === "/Home" || pathname === "/";
  }
  if (itemPath === "/Historia") {
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

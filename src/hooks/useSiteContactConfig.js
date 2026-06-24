import { useEffect, useMemo, useState } from "react";

import { mergeSiteContactConfig } from "@/lib/contactDetails";
import { FOOTER_SITE_CONFIG_DEFAULTS, getSiteConfig } from "@/lib/siteConfig";

/** Textos de contacto e horários (siteConfig). */
export default function useSiteContactConfig() {
  const [cfg, setCfg] = useState(() => mergeSiteContactConfig(getSiteConfig()));

  useEffect(() => {
    const sync = () => setCfg(mergeSiteContactConfig(getSiteConfig()));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("icer-site-config", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("icer-site-config", sync);
    };
  }, []);

  return useMemo(() => {
    const pick = (key) => String(cfg[key] ?? FOOTER_SITE_CONFIG_DEFAULTS[key] ?? "").trim();
    return {
      footerDescricao: pick("footerDescricao"),
      footerHorario1Dia: pick("footerHorario1Dia"),
      footerHorario1Desc: pick("footerHorario1Desc"),
      footerHorario2Dia: pick("footerHorario2Dia"),
      footerHorario2Desc: pick("footerHorario2Desc"),
    };
  }, [cfg]);
}

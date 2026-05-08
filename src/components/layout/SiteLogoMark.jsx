import { useState, useEffect } from "react";

import { getSiteConfig, DEFAULT_SITE_LOGO_URL } from "@/lib/siteConfig";
import SafeImg from "@/components/shared/SafeImg";

export function useSiteLogoUrl() {
  const [logoUrl, setLogoUrl] = useState(() => getSiteConfig().logoUrl || "");

  useEffect(() => {
    const onCfg = () => setLogoUrl(getSiteConfig().logoUrl || "");
    window.addEventListener("icer-site-config", onCfg);
    return () => window.removeEventListener("icer-site-config", onCfg);
  }, []);

  return logoUrl;
}

/**
 * Marca visual — imagem personalizada (`logoUrl`) ou logo por defeito em `public/`.
 */
export default function SiteLogoMark({ imgClassName }) {
  const stored = useSiteLogoUrl()?.trim();
  const src = stored || DEFAULT_SITE_LOGO_URL;

  return (
    <SafeImg
      src={src}
      alt="ICER Chapecó — Bíblia com cruz"
      className={imgClassName}
      decoding="async"
    />
  );
}

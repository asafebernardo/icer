import { useState, useEffect } from "react";
import { Church } from "lucide-react";

import { getSiteConfig } from "@/lib/siteConfig";

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
 * Marca visual (imagem enviada ou ícone padrão) — mesma fonte em navbar e rodapé.
 */
export default function SiteLogoMark({
  imgClassName,
  fallbackClassName,
  iconClassName,
}) {
  const logoUrl = useSiteLogoUrl();

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="ICER Chapecó"
        className={imgClassName}
        decoding="async"
      />
    );
  }

  return (
    <div className={fallbackClassName}>
      <Church className={iconClassName} />
    </div>
  );
}

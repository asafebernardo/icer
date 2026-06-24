import { useEffect, useMemo, useState } from "react";

import { getSiteConfig } from "@/lib/siteConfig";
import {
  mergeSiteContactConfig,
  resolveSiteContactDetails,
} from "@/lib/contactDetails";

export default function useSiteContactDetails() {
  const [cfg, setCfg] = useState(() => mergeSiteContactConfig(getSiteConfig()));

  useEffect(() => {
    const sync = () => setCfg(mergeSiteContactConfig(getSiteConfig()));
    sync();
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  return useMemo(() => resolveSiteContactDetails(cfg), [cfg]);
}

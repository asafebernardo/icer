import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  syncDocumentBrandingFromSiteConfig,
} from "@/lib/siteConfig";
import { initSiteTheme } from "@/lib/siteTheme";
import { purgeLegacyDemoStorage } from "@/lib/purgeLegacyDemoStorage";
import { refreshRecaptchaConfig } from "@/lib/recaptcha";

purgeLegacyDemoStorage();

initSiteTheme();

const initialCfg = getSiteConfig();
syncDocumentBrandingFromSiteConfig(initialCfg);

// Carrega config pública do servidor (se existir) e re-hidrata UI.
refreshPublicSiteConfig()
  .then((cfg) => {
    syncDocumentBrandingFromSiteConfig(cfg);
  })
  .catch(() => {
    // Se falhar, mantém o cache local/legado.
  });

void refreshRecaptchaConfig();

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  syncDocumentBrandingFromSiteConfig,
} from "@/lib/siteConfig";
import { applySiteTheme } from "@/lib/siteTheme";
import { purgeLegacyDemoStorage } from "@/lib/purgeLegacyDemoStorage";
import { captureLoginIntentFromBrowserUrl } from "@/lib/loginIntent";
import { refreshRecaptchaConfig } from "@/lib/recaptcha";

purgeLegacyDemoStorage();
captureLoginIntentFromBrowserUrl();

// Tema escuro institucional (#08111F …) — sempre ativo.
document.documentElement.classList.add("dark");

const initialCfg = getSiteConfig();
applySiteTheme();
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

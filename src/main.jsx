import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  syncDocumentBrandingFromSiteConfig,
} from "@/lib/siteConfig";
import { applySiteColorPalette } from "@/lib/colorPalettes";
import { getUserColorPalette } from "@/lib/userColorPalette";
import { purgeLegacyDemoStorage } from "@/lib/purgeLegacyDemoStorage";
import { captureLoginIntentFromBrowserUrl } from "@/lib/loginIntent";

purgeLegacyDemoStorage();
captureLoginIntentFromBrowserUrl();

// Tema (claro/escuro) é por navegador.
const savedTheme = localStorage.getItem("church-theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

const initialCfg = getSiteConfig();
applySiteColorPalette(getUserColorPalette(undefined));
syncDocumentBrandingFromSiteConfig(initialCfg);

// Carrega config pública do servidor (se existir) e re-hidrata UI.
refreshPublicSiteConfig()
  .then((cfg) => {
    syncDocumentBrandingFromSiteConfig(cfg);
  })
  .catch(() => {
    // Se falhar, mantém o cache local/legado.
  });

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import {
  getSiteConfig,
  syncDocumentBrandingFromSiteConfig,
} from "@/lib/siteConfig";
import { applySiteColorPalette } from "@/lib/colorPalettes";
import { purgeLegacyDemoStorage } from "@/lib/purgeLegacyDemoStorage";

purgeLegacyDemoStorage();

const savedTheme = localStorage.getItem("church-theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}
const initialCfg = getSiteConfig();
applySiteColorPalette(initialCfg.colorPalette || "azul");
syncDocumentBrandingFromSiteConfig(initialCfg);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import { AuthProvider } from "@/lib/AuthContext";
import { getSiteConfig } from "@/lib/siteConfig";
import { applySiteColorPalette } from "@/lib/colorPalettes";
import { purgeLegacyDemoStorage } from "@/lib/purgeLegacyDemoStorage";

purgeLegacyDemoStorage();

const savedTheme = localStorage.getItem("church-theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}
applySiteColorPalette(getSiteConfig().colorPalette || "azul");

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);

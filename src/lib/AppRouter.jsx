import { useEffect } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";

import {
  captureLoginIntentFromBrowserUrl,
  hasLoginIntent,
  isLoginPath,
  setLoginIntent,
} from "@/lib/loginIntent";
import { maskBrowserUrl } from "@/lib/maskBrowserUrl";

/** Garante que /login ou intenção guardada abrem a página de login. */
function SyncLoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    captureLoginIntentFromBrowserUrl();
    const browserPath = window.location.pathname;
    if (isLoginPath(browserPath) && !isLoginPath(location.pathname)) {
      setLoginIntent();
      navigate("/login", { replace: true });
      return;
    }
    if (hasLoginIntent() && !isLoginPath(location.pathname)) {
      navigate("/login", { replace: true });
    }
    // Só na montagem: evita prender o utilizador em /login ao navegar no site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Mantém a barra de endereço só com o domínio (exceto /login e /accept-invite). */
function MaskBrowserUrl() {
  const location = useLocation();
  useEffect(() => {
    maskBrowserUrl(location.pathname);
  }, [location.pathname, location.search, location.hash, location.key]);
  return null;
}

if (typeof window !== "undefined") {
  captureLoginIntentFromBrowserUrl();
}

export default function AppRouter({ children }) {
  return (
    <BrowserRouter>
      <SyncLoginRoute />
      <MaskBrowserUrl />
      {children}
    </BrowserRouter>
  );
}

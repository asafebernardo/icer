import { useState, useEffect, useCallback, useRef } from "react";

import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { canEditPageBackground, getUser } from "@/lib/auth";

function readCanEdit(pageKey) {
  return canEditPageBackground(getUser(), pageKey);
}

/** URL do fundo guardada em `siteConfig` (ex.: hero da página de login). */
export function getPageBackgroundUrl(pageKey) {
  if (!pageKey) return "";
  const cfg = getSiteConfig();
  if (pageKey === "home") {
    const sl = cfg.homeHeroSlides;
    if (Array.isArray(sl) && sl.length > 0 && sl[0]) return sl[0];
    return cfg.pageBackgrounds?.home || cfg.heroBg || "";
  }
  return cfg.pageBackgrounds?.[pageKey] || "";
}

function readBgUrl(pageKey) {
  return getPageBackgroundUrl(pageKey);
}

/**
 * Fundo por página (localStorage) + deteção de admin.
 * @param {string | undefined} pageKey ex.: "postagens", "home"
 */
export function usePageBackground(pageKey) {
  const [url, setUrl] = useState(() => readBgUrl(pageKey));
  const [isAdmin, setIsAdmin] = useState(() => readCanEdit(pageKey));
  const revokeRef = useRef(null);

  useEffect(() => {
    setUrl(readBgUrl(pageKey));
    setIsAdmin(readCanEdit(pageKey));
  }, [pageKey]);

  useEffect(() => {
    const onCfg = () => {
      setUrl(readBgUrl(pageKey));
    };
    const onStorage = (e) => {
      if (e.key === "user" || e.key === "icer_site_config") {
        onCfg();
        if (e.key === "user") setIsAdmin(readCanEdit(pageKey));
      }
    };
    const onPermOrSession = () => {
      setIsAdmin(readCanEdit(pageKey));
    };
    window.addEventListener("icer-site-config", onCfg);
    window.addEventListener("storage", onStorage);
    window.addEventListener("icer-member-permissions", onPermOrSession);
    window.addEventListener("icer-user-session", onPermOrSession);
    return () => {
      window.removeEventListener("icer-site-config", onCfg);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("icer-member-permissions", onPermOrSession);
      window.removeEventListener("icer-user-session", onPermOrSession);
    };
  }, [pageKey]);

  const applyUrl = useCallback(
    (nextUrl) => {
      if (!pageKey) return;
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
      const cfg = getSiteConfig();
      const nextBg = {
        ...(cfg.pageBackgrounds || {}),
        [pageKey]: nextUrl,
      };
      if (pageKey === "home") {
        setSiteConfig({ pageBackgrounds: nextBg, heroBg: nextUrl });
      } else {
        setSiteConfig({ pageBackgrounds: nextBg });
      }
      setUrl(nextUrl);
    },
    [pageKey],
  );

  const handleFile = useCallback(
    async (file) => {
      if (!file || !pageKey) return;
      try {
        const nextUrl = await imageFileToStorableUrl(file);
        if (revokeRef.current) {
          URL.revokeObjectURL(revokeRef.current);
          revokeRef.current = null;
        }
        if (typeof nextUrl === "string" && nextUrl.startsWith("blob:")) {
          revokeRef.current = nextUrl;
        }
        applyUrl(nextUrl);
      } catch (e) {
        console.warn("[usePageBackground]", e);
      }
    },
    [pageKey, applyUrl],
  );

  return { url, isAdmin, handleFile, applyUrl };
}

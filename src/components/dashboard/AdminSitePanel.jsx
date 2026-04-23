import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  Palette,
  RefreshCw,
  LayoutGrid,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { uploadImageFile } from "@/lib/uploadImage";
import {
  DEFAULT_SITE_LOGO_URL,
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
} from "@/lib/siteConfig";
import { getPageBackgroundUrl } from "@/lib/usePageBackground";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { PALETTE_OPTIONS, applySiteColorPalette } from "@/lib/colorPalettes";
import { purgeLegacyLocalAccounts } from "@/lib/purgeLegacyLocalAccounts";
import { useAuth } from "@/lib/AuthContext";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import { fetchPublicWorkspaceJson, putAdminPublicWorkspace } from "@/lib/publicWorkspace";
import {
  DEFAULT_HOME_INSTAGRAM_CARD_TEXT,
  DEFAULT_HOME_INSTAGRAM_CARD_TITLE,
  DEFAULT_HOME_INSTAGRAM_CARD_URL,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_SUBTITLE,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_TAG,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_TITLE,
  DEFAULT_HOME_YOUTUBE_CARD_TEXT,
  DEFAULT_HOME_YOUTUBE_CARD_TITLE,
  DEFAULT_HOME_YOUTUBE_CARD_URL,
} from "@/lib/homeContentDefaults";

async function fetchHomeViewsAdmin(params) {
  const sp = new URLSearchParams();
  sp.set("limit", String(params.limit || 200));
  sp.set("skip", String(params.skip || 0));
  if (params.q && String(params.q).trim()) sp.set("q", String(params.q).trim());
  const r = await fetch(`/api/admin/metrics/home-views?${sp.toString()}`, {
    credentials: "include",
  });
  if (!r.ok) {
    const t = await r.text();
    let msg = t;
    try {
      msg = JSON.parse(t).message || t;
    } catch {
      /* ignore */
    }
    throw new Error(msg || r.statusText);
  }
  return r.json();
}

function formatTs(iso) {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

const MEMBER_MENUS = [
  { key: "galeria", label: "Galeria de Fotos" },
  { key: "materiais_tab", label: "Materiais (na aba Recursos)" },
];

export default function AdminSitePanel() {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState(() => getSiteConfig().logoUrl || "");
  const [loginHeroUrl, setLoginHeroUrl] = useState(() =>
    getPageBackgroundUrl("login"),
  );
  const [loginFormBgUrl, setLoginFormBgUrl] = useState(() =>
    getPageBackgroundUrl("login_form"),
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [menuConfig, setMenuConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("icer_member_menus") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!isServerAuthEnabled()) return;
    let cancelled = false;
    fetchPublicWorkspaceJson()
      .then((w) => {
        if (cancelled || !w) return;
        if (typeof w.member_menu_palettes === "object") {
          setMenuConfig(w.member_menu_palettes);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [paletteId, setPaletteId] = useState(
    () => getSiteConfig().colorPalette || "azul",
  );
  const [sessionTtl, setSessionTtl] = useState(120);
  const [loadingSessionTtl, setLoadingSessionTtl] = useState(true);
  const [savingSessionTtl, setSavingSessionTtl] = useState(false);
  const [purgingLocal, setPurgingLocal] = useState(false);
  const logoRef = useRef();
  const [homeViewsSearch, setHomeViewsSearch] = useState("");
  const [homeViewsApplied, setHomeViewsApplied] = useState({ q: "", skip: 0, limit: 200 });

  const {
    data: homeViewsData,
    isLoading: homeViewsLoading,
    error: homeViewsError,
    refetch: refetchHomeViews,
    isFetching: homeViewsFetching,
  } = useQuery({
    queryKey: ["admin-home-views", homeViewsApplied],
    queryFn: () => fetchHomeViewsAdmin(homeViewsApplied),
    enabled: isServerAuthEnabled() && user?._authSource === "server",
  });

  const [socialYoutube, setSocialYoutube] = useState(() => {
    const c = getSiteConfig();
    return Object.prototype.hasOwnProperty.call(c, "socialYoutubeUrl")
      ? String(c.socialYoutubeUrl ?? "")
      : String(c.channelUrl ?? "");
  });
  const [socialInstagram, setSocialInstagram] = useState(() => {
    const c = getSiteConfig();
    return Object.prototype.hasOwnProperty.call(c, "socialInstagramUrl")
      ? String(c.socialInstagramUrl ?? "")
      : String(c.instagramUrl ?? "");
  });
  const [socialFacebook, setSocialFacebook] = useState(() =>
    String(getSiteConfig().socialFacebookUrl ?? ""),
  );
  const [socialWhatsapp, setSocialWhatsapp] = useState(() =>
    String(getSiteConfig().socialWhatsappUrl ?? ""),
  );
  const [savingSocial, setSavingSocial] = useState(false);

  const cfgOwn = (c, k) => Object.prototype.hasOwnProperty.call(c, k);

  const [homeYtTitle, setHomeYtTitle] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "homeYoutubeCardTitle")
      ? String(c.homeYoutubeCardTitle ?? "").trim()
      : DEFAULT_HOME_YOUTUBE_CARD_TITLE;
  });
  const [homeYtText, setHomeYtText] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "homeYoutubeCardText")
      ? String(c.homeYoutubeCardText ?? "").trim()
      : DEFAULT_HOME_YOUTUBE_CARD_TEXT;
  });
  const [homeYtUrl, setHomeYtUrl] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "homeYoutubeCardUrl")
      ? String(c.homeYoutubeCardUrl ?? "").trim()
      : DEFAULT_HOME_YOUTUBE_CARD_URL;
  });
  const [homeIgTitle, setHomeIgTitle] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "homeInstagramCardTitle")
      ? String(c.homeInstagramCardTitle ?? "").trim()
      : DEFAULT_HOME_INSTAGRAM_CARD_TITLE;
  });
  const [homeIgText, setHomeIgText] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "homeInstagramCardText")
      ? String(c.homeInstagramCardText ?? "").trim()
      : DEFAULT_HOME_INSTAGRAM_CARD_TEXT;
  });
  const [homeIgUrl, setHomeIgUrl] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "homeInstagramCardUrl")
      ? String(c.homeInstagramCardUrl ?? "").trim()
      : DEFAULT_HOME_INSTAGRAM_CARD_URL;
  });
  const [savingHomeCards, setSavingHomeCards] = useState(false);
  const [homeSocialSectionTag, setHomeSocialSectionTag] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "homeSocialCardsSectionTag")
      ? String(c.homeSocialCardsSectionTag ?? "").trim()
      : DEFAULT_HOME_SOCIAL_CARDS_SECTION_TAG;
  });
  const [homeSocialSectionTitle, setHomeSocialSectionTitle] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "homeSocialCardsSectionTitle")
      ? String(c.homeSocialCardsSectionTitle ?? "").trim()
      : DEFAULT_HOME_SOCIAL_CARDS_SECTION_TITLE;
  });
  const [homeSocialSectionSubtitle, setHomeSocialSectionSubtitle] = useState(
    () => {
      const c = getSiteConfig();
      return cfgOwn(c, "homeSocialCardsSectionSubtitle")
        ? String(c.homeSocialCardsSectionSubtitle ?? "").trim()
        : DEFAULT_HOME_SOCIAL_CARDS_SECTION_SUBTITLE;
    },
  );

  const loadHomeCardFieldsFromConfig = () => {
    const c = getSiteConfig();
    setHomeSocialSectionTag(
      cfgOwn(c, "homeSocialCardsSectionTag")
        ? String(c.homeSocialCardsSectionTag ?? "").trim()
        : DEFAULT_HOME_SOCIAL_CARDS_SECTION_TAG,
    );
    setHomeSocialSectionTitle(
      cfgOwn(c, "homeSocialCardsSectionTitle")
        ? String(c.homeSocialCardsSectionTitle ?? "").trim()
        : DEFAULT_HOME_SOCIAL_CARDS_SECTION_TITLE,
    );
    setHomeSocialSectionSubtitle(
      cfgOwn(c, "homeSocialCardsSectionSubtitle")
        ? String(c.homeSocialCardsSectionSubtitle ?? "").trim()
        : DEFAULT_HOME_SOCIAL_CARDS_SECTION_SUBTITLE,
    );
    setHomeYtTitle(
      cfgOwn(c, "homeYoutubeCardTitle")
        ? String(c.homeYoutubeCardTitle ?? "").trim()
        : DEFAULT_HOME_YOUTUBE_CARD_TITLE,
    );
    setHomeYtText(
      cfgOwn(c, "homeYoutubeCardText")
        ? String(c.homeYoutubeCardText ?? "").trim()
        : DEFAULT_HOME_YOUTUBE_CARD_TEXT,
    );
    setHomeYtUrl(
      cfgOwn(c, "homeYoutubeCardUrl")
        ? String(c.homeYoutubeCardUrl ?? "").trim()
        : DEFAULT_HOME_YOUTUBE_CARD_URL,
    );
    setHomeIgTitle(
      cfgOwn(c, "homeInstagramCardTitle")
        ? String(c.homeInstagramCardTitle ?? "").trim()
        : DEFAULT_HOME_INSTAGRAM_CARD_TITLE,
    );
    setHomeIgText(
      cfgOwn(c, "homeInstagramCardText")
        ? String(c.homeInstagramCardText ?? "").trim()
        : DEFAULT_HOME_INSTAGRAM_CARD_TEXT,
    );
    setHomeIgUrl(
      cfgOwn(c, "homeInstagramCardUrl")
        ? String(c.homeInstagramCardUrl ?? "").trim()
        : DEFAULT_HOME_INSTAGRAM_CARD_URL,
    );
  };

  const loadSocialFieldsFromConfig = () => {
    const c = getSiteConfig();
    setSocialYoutube(
      Object.prototype.hasOwnProperty.call(c, "socialYoutubeUrl")
        ? String(c.socialYoutubeUrl ?? "")
        : String(c.channelUrl ?? ""),
    );
    setSocialInstagram(
      Object.prototype.hasOwnProperty.call(c, "socialInstagramUrl")
        ? String(c.socialInstagramUrl ?? "")
        : String(c.instagramUrl ?? ""),
    );
    setSocialFacebook(String(c.socialFacebookUrl ?? ""));
    setSocialWhatsapp(String(c.socialWhatsappUrl ?? ""));
  };

  useEffect(() => {
    loadSocialFieldsFromConfig();
    loadHomeCardFieldsFromConfig();
    const onCfg = () => {
      loadSocialFieldsFromConfig();
      loadHomeCardFieldsFromConfig();
    };
    window.addEventListener("icer-site-config", onCfg);
    return () => window.removeEventListener("icer-site-config", onCfg);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/session-ttl", {
          credentials: "include",
        });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled && j?.ttl_minutes) {
          setSessionTtl(Number(j.ttl_minutes) || 120);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingSessionTtl(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSocialLinks = async () => {
    setSavingSocial(true);
    try {
      await savePublicSiteConfigAdmin({
        socialYoutubeUrl: socialYoutube.trim(),
        socialInstagramUrl: socialInstagram.trim(),
        socialFacebookUrl: socialFacebook.trim(),
        socialWhatsappUrl: socialWhatsapp.trim(),
      });
      await refreshPublicSiteConfig();
      toast.success("Redes sociais atualizadas.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar as redes sociais.");
    } finally {
      setSavingSocial(false);
    }
  };

  const saveHomeSocialCards = async () => {
    setSavingHomeCards(true);
    try {
      await savePublicSiteConfigAdmin({
        homeSocialCardsSectionTag: homeSocialSectionTag.trim(),
        homeSocialCardsSectionTitle: homeSocialSectionTitle.trim(),
        homeSocialCardsSectionSubtitle: homeSocialSectionSubtitle.trim(),
        homeYoutubeCardTitle: homeYtTitle.trim(),
        homeYoutubeCardText: homeYtText.trim(),
        homeYoutubeCardUrl: homeYtUrl.trim(),
        homeInstagramCardTitle: homeIgTitle.trim(),
        homeInstagramCardText: homeIgText.trim(),
        homeInstagramCardUrl: homeIgUrl.trim(),
      });
      await refreshPublicSiteConfig();
      toast.success("Cartões da home atualizados.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar os cartões da home.");
    } finally {
      setSavingHomeCards(false);
    }
  };

  const saveSessionTtl = async () => {
    setSavingSessionTtl(true);
    try {
      const r = await fetch("/api/admin/session-ttl", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttl_minutes: sessionTtl }),
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        const msg = parsed?.message || "Não foi possível salvar.";
        throw new Error(msg);
      }
      toast.success("Tempo de sessão atualizado.");
    } catch (e) {
      toast.error(e?.message || "Erro ao salvar tempo de sessão.");
    } finally {
      setSavingSessionTtl(false);
    }
  };

  const purgeLocalUsers = async () => {
    setPurgingLocal(true);
    try {
      const keep = String(import.meta.env.VITE_DEMO_ADMIN_EMAIL || "")
        .toLowerCase()
        .trim();
      const { removed, kept } = purgeLegacyLocalAccounts({
        keepEmails: keep ? [keep] : [],
      });
      toast.success(
        `Limpeza concluída. Removidos: ${removed}${kept ? ` • Mantidos: ${kept}` : ""}`,
      );
    } catch (e) {
      toast.error(e?.message || "Erro ao limpar usuários locais.");
    } finally {
      setPurgingLocal(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await uploadImageFile(file);
      setLogoUrl(file_url);
      await savePublicSiteConfigAdmin({ logoUrl: file_url });
      await refreshPublicSiteConfig();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const applyLoginBackground = async (e, key) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await imageFileToStorableUrl(file);
      const cfg = getSiteConfig();
      const nextBg = { ...(cfg.pageBackgrounds || {}), [key]: url };
      await savePublicSiteConfigAdmin({ pageBackgrounds: nextBg });
      await refreshPublicSiteConfig();
      if (key === "login") setLoginHeroUrl(url);
      else setLoginFormBgUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  const clearLoginBackground = (key) => {
    const cfg = getSiteConfig();
    const nextBg = { ...(cfg.pageBackgrounds || {}) };
    delete nextBg[key];
    savePublicSiteConfigAdmin({ pageBackgrounds: nextBg })
      .then(() => refreshPublicSiteConfig())
      .catch(() => {});
    if (key === "login") setLoginHeroUrl("");
    else setLoginFormBgUrl("");
  };

  const handleToggleMenu = async (key) => {
    const updated = { ...menuConfig, [key]: !menuConfig[key] };
    setMenuConfig(updated);
    if (isServerAuthEnabled()) {
      try {
        await putAdminPublicWorkspace({ member_menu_palettes: updated });
      } catch (e) {
        toast.error(e?.message || "Erro ao guardar visibilidade dos menus.");
      }
    } else {
      localStorage.setItem("icer_member_menus", JSON.stringify(updated));
    }
  };

  const {
    data: activeSessions = [],
    isLoading: loadingSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["admin-active-sessions"],
    queryFn: async () => {
      const r = await fetch("/api/admin/sessions/active", {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Erro ao carregar sessões.");
      return r.json();
    },
  });

  const [kickingUser, setKickingUser] = useState({});
  const kickUser = async (userId) => {
    setKickingUser((m) => ({ ...m, [userId]: true }));
    try {
      const r = await fetch(`/api/admin/sessions/active/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) throw new Error(parsed?.message || "Não foi possível derrubar.");
      toast.success("Sessão derrubada.");
      refetchSessions();
    } catch (e) {
      toast.error(e?.message || "Erro ao derrubar sessão.");
    } finally {
      setKickingUser((m) => ({ ...m, [userId]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <ImagePlus className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">Logo do Site</h2>
            <p className="text-sm text-muted-foreground">
              Sem imagem enviada, usa-se a logo por defeito do site. Carregue uma
              imagem para personalizar.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <img
            src={logoUrl || DEFAULT_SITE_LOGO_URL}
            alt="Pré-visualização da logo"
            className="h-12 w-auto rounded-lg border border-border object-contain"
          />
          <Button
            variant="outline"
            onClick={() => logoRef.current.click()}
            disabled={uploadingLogo}
            className="gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            {uploadingLogo ? "Enviando..." : logoUrl ? "Trocar logo" : "Carregar logo"}
          </Button>
          {logoUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setLogoUrl("");
                    savePublicSiteConfigAdmin({ logoUrl: "" })
                      .then(() => refreshPublicSiteConfig())
                      .catch(() => {});
              }}
            >
              Remover
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">Redes sociais</h2>
            <p className="text-sm text-muted-foreground">
              Ícones no rodapé. WhatsApp: número com DDI/DDD ou link{" "}
              <span className="whitespace-nowrap">wa.me</span>. Os cartões da página
              inicial (YouTube e Instagram) editam-se na secção seguinte.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin-social-yt">YouTube</Label>
            <Input
              id="admin-social-yt"
              type="url"
              placeholder="https://www.youtube.com/@…"
              value={socialYoutube}
              onChange={(e) => setSocialYoutube(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-social-ig">Instagram</Label>
            <Input
              id="admin-social-ig"
              type="url"
              placeholder="https://www.instagram.com/…"
              value={socialInstagram}
              onChange={(e) => setSocialInstagram(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-social-fb">Facebook</Label>
            <Input
              id="admin-social-fb"
              type="url"
              placeholder="https://www.facebook.com/…"
              value={socialFacebook}
              onChange={(e) => setSocialFacebook(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-social-wa">WhatsApp</Label>
            <Input
              id="admin-social-wa"
              type="text"
              placeholder="5549999999999 ou https://wa.me/…"
              value={socialWhatsapp}
              onChange={(e) => setSocialWhatsapp(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={saveSocialLinks}
            disabled={savingSocial}
            className="gap-2"
          >
            {savingSocial ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.045 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">
              Cartões na página inicial
            </h2>
            <p className="text-sm text-muted-foreground">
              Dois cartões com as cores de cada rede, logo após «Sobre nós». Deixe o
              URL vazio para ocultar um cartão.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <div className="space-y-2">
            <Label htmlFor="home-social-section-tag">Etiqueta (linha pequena acima)</Label>
            <Input
              id="home-social-section-tag"
              value={homeSocialSectionTag}
              onChange={(e) => setHomeSocialSectionTag(e.target.value)}
              placeholder={DEFAULT_HOME_SOCIAL_CARDS_SECTION_TAG}
            />
            <p className="text-xs text-muted-foreground">
              Como «Nossos cultos» na secção de horários.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="home-social-section-title">Título da secção</Label>
            <Input
              id="home-social-section-title"
              value={homeSocialSectionTitle}
              onChange={(e) => setHomeSocialSectionTitle(e.target.value)}
              placeholder={DEFAULT_HOME_SOCIAL_CARDS_SECTION_TITLE}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="home-social-section-subtitle">Texto de apoio</Label>
            <Textarea
              id="home-social-section-subtitle"
              rows={2}
              value={homeSocialSectionSubtitle}
              onChange={(e) => setHomeSocialSectionSubtitle(e.target.value)}
              placeholder={DEFAULT_HOME_SOCIAL_CARDS_SECTION_SUBTITLE}
            />
            <p className="text-xs text-muted-foreground">
              Parágrafo abaixo do traço colorido, como em horários de funcionamento.
            </p>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border/80 p-4 bg-muted/20">
            <p className="text-sm font-semibold text-foreground">YouTube</p>
            <div className="space-y-2">
              <Label htmlFor="home-yt-title">Título</Label>
              <Input
                id="home-yt-title"
                value={homeYtTitle}
                onChange={(e) => setHomeYtTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-yt-text">Texto</Label>
              <Textarea
                id="home-yt-text"
                rows={3}
                value={homeYtText}
                onChange={(e) => setHomeYtText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-yt-url">Link</Label>
              <Input
                id="home-yt-url"
                type="url"
                placeholder="https://www.youtube.com/@…"
                value={homeYtUrl}
                onChange={(e) => setHomeYtUrl(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-border/80 p-4 bg-muted/20">
            <p className="text-sm font-semibold text-foreground">Instagram</p>
            <div className="space-y-2">
              <Label htmlFor="home-ig-title">Título</Label>
              <Input
                id="home-ig-title"
                value={homeIgTitle}
                onChange={(e) => setHomeIgTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-ig-text">Texto</Label>
              <Textarea
                id="home-ig-text"
                rows={3}
                value={homeIgText}
                onChange={(e) => setHomeIgText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-ig-url">Link</Label>
              <Input
                id="home-ig-url"
                type="url"
                placeholder="https://www.instagram.com/…"
                value={homeIgUrl}
                onChange={(e) => setHomeIgUrl(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={saveHomeSocialCards}
            disabled={savingHomeCards}
            className="gap-2"
          >
            {savingHomeCards ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">Tempo de sessão</h2>
            <p className="text-sm text-muted-foreground">
              Define por quanto tempo a sessão permanece ativa após o login.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={String(sessionTtl)}
            onValueChange={(v) => setSessionTtl(Number(v))}
            disabled={loadingSessionTtl || savingSessionTtl}
          >
            <SelectTrigger className="h-9 w-56">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 minutos</SelectItem>
              <SelectItem value="30">30 minutos</SelectItem>
              <SelectItem value="60">1 hora</SelectItem>
              <SelectItem value="120">2 horas</SelectItem>
              <SelectItem value="300">5 horas</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            onClick={saveSessionTtl}
            disabled={loadingSessionTtl || savingSessionTtl}
            className="gap-2"
          >
            {savingSessionTtl ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.065 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Acessos na Home (por IP)
              </h2>
              <p className="text-sm text-muted-foreground">
                Total:{" "}
                <strong className="text-foreground">
                  {homeViewsData?.total_views ?? 0}
                </strong>{" "}
                · IPs únicos:{" "}
                <strong className="text-foreground">
                  {homeViewsData?.unique_ips ?? 0}
                </strong>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchHomeViews()}
            disabled={homeViewsFetching}
            title="Atualizar"
          >
            <RefreshCw
              className={`w-4 h-4 ${homeViewsFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div className="space-y-2">
            <Label htmlFor="home-views-search">Buscar IP</Label>
            <Input
              id="home-views-search"
              value={homeViewsSearch}
              onChange={(e) => setHomeViewsSearch(e.target.value)}
              placeholder="Ex.: 191.23.0.1"
              className="h-9 w-64"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() =>
              setHomeViewsApplied({ q: homeViewsSearch.trim(), skip: 0, limit: 200 })
            }
          >
            Filtrar
          </Button>
        </div>

        {homeViewsError && (
          <p className="text-sm text-destructive mb-4">
            {homeViewsError.message || "Erro ao carregar acessos."}
          </p>
        )}

        {homeViewsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (homeViewsData?.rows || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhum acesso registrado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left font-medium p-3">IP</th>
                  <th className="text-center font-medium p-3 w-28">Acessos</th>
                  <th className="text-left font-medium p-3 w-44">Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {(homeViewsData?.rows || []).map((r) => (
                  <tr
                    key={r.ip}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="p-3 text-foreground">{r.ip}</td>
                    <td className="p-3 text-center tabular-nums">
                      {typeof r.count === "number" ? r.count : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatTs(r.last_seen_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <ImagePlus className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">Página de login</h2>
            <p className="text-sm text-muted-foreground">
              Fundo do cabeçalho (hero) e fundo da zona do formulário — guardado
              neste navegador
            </p>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">1. Cabeçalho (hero)</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="login-hero-bg"
              onChange={(e) => applyLoginBackground(e, "login")}
            />
            {loginHeroUrl ? (
              <div className="h-24 rounded-lg border border-border overflow-hidden bg-muted">
                <img src={loginHeroUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma imagem</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("login-hero-bg")?.click()}
              >
                Carregar
              </Button>
              {loginHeroUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => clearLoginBackground("login")}
                >
                  Remover
                </Button>
              ) : null}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">2. Zona do formulário</p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="login-form-bg"
              onChange={(e) => applyLoginBackground(e, "login_form")}
            />
            {loginFormBgUrl ? (
              <div className="h-24 rounded-lg border border-border overflow-hidden bg-muted">
                <img src={loginFormBgUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma imagem</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("login-form-bg")?.click()}
              >
                Carregar
              </Button>
              {loginFormBgUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => clearLoginBackground("login_form")}
                >
                  Remover
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Eye className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">
              Visibilidade de Menus
            </h2>
            <p className="text-sm text-muted-foreground">
              Controle quais seções membros podem acessar
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {MEMBER_MENUS.map((menu) => {
            const enabled = menuConfig[menu.key] !== false;
            return (
              <div
                key={menu.key}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  {enabled ? (
                    <Eye className="w-4 h-4 text-accent" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground text-sm">
                    {menu.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMenu(menu.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    enabled ? "bg-accent" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          * As configurações são salvas localmente e aplicadas ao menu de navegação.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">Cor geral do site</h2>
            <p className="text-sm text-muted-foreground">
              Escolha uma de 8 paletas (destaques, botões, foco e tema claro/escuro).
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PALETTE_OPTIONS.map((p) => {
            const selected = paletteId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPaletteId(p.id);
                          savePublicSiteConfigAdmin({ colorPalette: p.id })
                            .then(() => refreshPublicSiteConfig())
                            .catch(() => {});
                  applySiteColorPalette(p.id);
                }}
                className={`rounded-xl border-2 p-3 text-left transition-all hover:opacity-95 ${
                  selected
                    ? "border-accent shadow-md ring-2 ring-accent/30"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <div
                  className={`h-11 rounded-lg bg-gradient-to-br ${p.preview} mb-2 shadow-inner`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-foreground leading-tight block">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          A paleta é guardada neste navegador (localStorage) com as permissões de
          menus.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.09 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Usuários logados agora
              </h2>
              <p className="text-sm text-muted-foreground">
                {Array.isArray(activeSessions) ? activeSessions.length : 0} sessão(ões)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchSessions()}
            disabled={loadingSessions}
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSessions ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loadingSessions ? (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
          </div>
        ) : !Array.isArray(activeSessions) || activeSessions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            Nenhuma sessão ativa.
          </p>
        ) : (
          <div className="space-y-2">
            {activeSessions.map((s) => (
              <div
                key={s.token_hash}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-xl gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {s.user_full_name || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.user_email || `user_id=${s.user_id}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    expira: {String(s.expires_at).replace("T", " ").replace("Z", "")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={kickingUser[s.user_id] === true || s.user_id === user?.id}
                  onClick={() => kickUser(s.user_id)}
                >
                  {kickingUser[s.user_id] ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Derrubar"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">
              Remover usuários antigos (local)
            </h2>
            <p className="text-sm text-muted-foreground">
              Apaga contas que eram criadas apenas neste navegador (antes do MongoDB).
              Mantém o admin demo do .env (se existir).
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          onClick={purgeLocalUsers}
          disabled={purgingLocal}
          className="gap-2"
        >
          {purgingLocal ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
          Limpar agora
        </Button>
      </motion.div>
    </div>
  );
}


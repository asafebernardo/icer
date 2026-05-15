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
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Lock,
  MapPin,
  Palette,
  RefreshCw,
  LayoutGrid,
  Share2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { uploadImageFile } from "@/lib/uploadImage";
import {
  DEFAULT_SITE_LOGO_URL,
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  FOOTER_SITE_CONFIG_DEFAULTS,
} from "@/lib/siteConfig";
import SafeImg from "@/components/shared/SafeImg";
import { PALETTE_OPTIONS, applySiteColorPalette } from "@/lib/colorPalettes";
import { getUserColorPalette, setUserColorPalette } from "@/lib/userColorPalette";
import { useAuth } from "@/lib/AuthContext";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import {
  DEFAULT_HOME_INSTAGRAM_CARD_TEXT,
  DEFAULT_HOME_INSTAGRAM_CARD_TITLE,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_SUBTITLE,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_TAG,
  DEFAULT_HOME_SOCIAL_CARDS_SECTION_TITLE,
  DEFAULT_HOME_YOUTUBE_CARD_TEXT,
  DEFAULT_HOME_YOUTUBE_CARD_TITLE,
} from "@/lib/homeContentDefaults";

const HOME_VIEWS_PAGE_SIZE = 5;

async function fetchHomeViewsAdmin(params) {
  const sp = new URLSearchParams();
  sp.set("limit", String(params.limit ?? HOME_VIEWS_PAGE_SIZE));
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

export default function AdminSitePanel() {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState(() => getSiteConfig().logoUrl || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [paletteId, setPaletteId] = useState(() => getUserColorPalette(undefined));

  useEffect(() => {
    setPaletteId(getUserColorPalette(user?.id));
  }, [user?.id]);
  const [sessionTtl, setSessionTtl] = useState(120);
  const [loadingSessionTtl, setLoadingSessionTtl] = useState(true);
  const [savingSessionTtl, setSavingSessionTtl] = useState(false);
  const logoRef = useRef();
  const [homeViewsSearch, setHomeViewsSearch] = useState("");
  const [homeViewsApplied, setHomeViewsApplied] = useState({
    q: "",
    skip: 0,
    limit: HOME_VIEWS_PAGE_SIZE,
  });

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

  const footerDef = FOOTER_SITE_CONFIG_DEFAULTS;
  const [footerEndereco, setFooterEndereco] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "footerEndereco")
      ? String(c.footerEndereco ?? "").trim()
      : footerDef.footerEndereco;
  });
  const [footerTelefone, setFooterTelefone] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "footerTelefone")
      ? String(c.footerTelefone ?? "").trim()
      : footerDef.footerTelefone;
  });
  const [footerEmail, setFooterEmail] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "footerEmail")
      ? String(c.footerEmail ?? "").trim()
      : footerDef.footerEmail;
  });
  const [footerHorario1Dia, setFooterHorario1Dia] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "footerHorario1Dia")
      ? String(c.footerHorario1Dia ?? "").trim()
      : footerDef.footerHorario1Dia;
  });
  const [footerHorario1Desc, setFooterHorario1Desc] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "footerHorario1Desc")
      ? String(c.footerHorario1Desc ?? "").trim()
      : footerDef.footerHorario1Desc;
  });
  const [footerHorario2Dia, setFooterHorario2Dia] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "footerHorario2Dia")
      ? String(c.footerHorario2Dia ?? "").trim()
      : footerDef.footerHorario2Dia;
  });
  const [footerHorario2Desc, setFooterHorario2Desc] = useState(() => {
    const c = getSiteConfig();
    return cfgOwn(c, "footerHorario2Desc")
      ? String(c.footerHorario2Desc ?? "").trim()
      : footerDef.footerHorario2Desc;
  });
  const [savingFooter, setSavingFooter] = useState(false);

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
  };

  const loadFooterFieldsFromConfig = () => {
    const c = getSiteConfig();
    const d = FOOTER_SITE_CONFIG_DEFAULTS;
    setFooterEndereco(cfgOwn(c, "footerEndereco") ? String(c.footerEndereco ?? "").trim() : d.footerEndereco);
    setFooterTelefone(cfgOwn(c, "footerTelefone") ? String(c.footerTelefone ?? "").trim() : d.footerTelefone);
    setFooterEmail(cfgOwn(c, "footerEmail") ? String(c.footerEmail ?? "").trim() : d.footerEmail);
    setFooterHorario1Dia(
      cfgOwn(c, "footerHorario1Dia") ? String(c.footerHorario1Dia ?? "").trim() : d.footerHorario1Dia,
    );
    setFooterHorario1Desc(
      cfgOwn(c, "footerHorario1Desc") ? String(c.footerHorario1Desc ?? "").trim() : d.footerHorario1Desc,
    );
    setFooterHorario2Dia(
      cfgOwn(c, "footerHorario2Dia") ? String(c.footerHorario2Dia ?? "").trim() : d.footerHorario2Dia,
    );
    setFooterHorario2Desc(
      cfgOwn(c, "footerHorario2Desc") ? String(c.footerHorario2Desc ?? "").trim() : d.footerHorario2Desc,
    );
  };

  useEffect(() => {
    loadSocialFieldsFromConfig();
    loadHomeCardFieldsFromConfig();
    loadFooterFieldsFromConfig();
    const onCfg = () => {
      loadSocialFieldsFromConfig();
      loadHomeCardFieldsFromConfig();
      loadFooterFieldsFromConfig();
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
      });
      await refreshPublicSiteConfig();
      toast.success("Redes sociais atualizadas.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar as redes sociais.");
    } finally {
      setSavingSocial(false);
    }
  };

  const saveFooterTexts = async () => {
    setSavingFooter(true);
    try {
      await savePublicSiteConfigAdmin({
        footerEndereco: footerEndereco.trim(),
        footerTelefone: footerTelefone.trim(),
        footerEmail: footerEmail.trim(),
        footerHorario1Dia: footerHorario1Dia.trim(),
        footerHorario1Desc: footerHorario1Desc.trim(),
        footerHorario2Dia: footerHorario2Dia.trim(),
        footerHorario2Desc: footerHorario2Desc.trim(),
      });
      await refreshPublicSiteConfig();
      toast.success("Rodapé atualizado.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar o rodapé.");
    } finally {
      setSavingFooter(false);
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
        homeInstagramCardTitle: homeIgTitle.trim(),
        homeInstagramCardText: homeIgText.trim(),
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
          <SafeImg
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
              Ícones no rodapé. Os textos de contacto e horários do rodapé editam-se na secção
              seguinte. Os cartões da página inicial (YouTube e Instagram) editam-se mais abaixo.
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
        transition={{ delay: 0.04 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <MapPin className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Rodapé (site público)</h2>
            <p className="text-sm text-muted-foreground">
              Endereço (mapa e «Como chegar»), telefone, e-mail e os dois blocos de horários
              visíveis no rodapé de todas as páginas.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="admin-footer-endereco">Endereço</Label>
            <Textarea
              id="admin-footer-endereco"
              rows={3}
              value={footerEndereco}
              onChange={(e) => setFooterEndereco(e.target.value)}
              placeholder={FOOTER_SITE_CONFIG_DEFAULTS.footerEndereco}
            />
            <p className="text-xs text-muted-foreground">
              Se ficar vazio, o mapa e o botão «Como chegar» deixam de aparecer no rodapé.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-footer-tel">Telefone</Label>
            <Input
              id="admin-footer-tel"
              value={footerTelefone}
              onChange={(e) => setFooterTelefone(e.target.value)}
              placeholder={FOOTER_SITE_CONFIG_DEFAULTS.footerTelefone}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-footer-email">E-mail</Label>
            <Input
              id="admin-footer-email"
              type="email"
              value={footerEmail}
              onChange={(e) => setFooterEmail(e.target.value)}
              placeholder={FOOTER_SITE_CONFIG_DEFAULTS.footerEmail}
            />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/15 p-4">
            <p className="text-sm font-semibold text-foreground">Horário 1</p>
            <div className="space-y-2">
              <Label htmlFor="admin-footer-h1-dia">Dia / título</Label>
              <Input
                id="admin-footer-h1-dia"
                value={footerHorario1Dia}
                onChange={(e) => setFooterHorario1Dia(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-footer-h1-desc">Descrição</Label>
              <Textarea
                id="admin-footer-h1-desc"
                rows={2}
                value={footerHorario1Desc}
                onChange={(e) => setFooterHorario1Desc(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/15 p-4">
            <p className="text-sm font-semibold text-foreground">Horário 2</p>
            <div className="space-y-2">
              <Label htmlFor="admin-footer-h2-dia">Dia / título</Label>
              <Input
                id="admin-footer-h2-dia"
                value={footerHorario2Dia}
                onChange={(e) => setFooterHorario2Dia(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-footer-h2-desc">Descrição</Label>
              <Textarea
                id="admin-footer-h2-desc"
                rows={2}
                value={footerHorario2Desc}
                onChange={(e) => setFooterHorario2Desc(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void saveFooterTexts()}
            disabled={savingFooter}
            className="gap-2"
          >
            {savingFooter ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            Salvar rodapé
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
                placeholder="(usa o link definido em Redes sociais)"
                value={socialYoutube}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                O URL do ícone no rodapé vem de{" "}
                <span className="font-medium text-foreground">Redes sociais</span> acima.
              </p>
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
                placeholder="(usa o link definido em Redes sociais)"
                value={socialInstagram}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                O URL do ícone no rodapé vem de{" "}
                <span className="font-medium text-foreground">Redes sociais</span> acima.
              </p>
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
              setHomeViewsApplied({
                q: homeViewsSearch.trim(),
                skip: 0,
                limit: HOME_VIEWS_PAGE_SIZE,
              })
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
            {Array.from({ length: HOME_VIEWS_PAGE_SIZE }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (homeViewsData?.rows || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhum acesso registrado ainda.
          </p>
        ) : (
          <>
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
            {(() => {
              const totalIps = Number(homeViewsData?.unique_ips ?? 0);
              const limit = homeViewsApplied.limit;
              const skip = homeViewsApplied.skip;
              const rowCount = (homeViewsData?.rows || []).length;
              if (!totalIps || !limit) return null;
              const totalPages = Math.max(1, Math.ceil(totalIps / limit));
              const currentPage = Math.floor(skip / limit) + 1;
              const from = skip + 1;
              const to = skip + rowCount;
              const canPrev = skip > 0;
              const canNext = skip + limit < totalIps;
              return (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                    {from}–{to} de {totalIps} · Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={!canPrev || homeViewsFetching}
                      onClick={() =>
                        setHomeViewsApplied((prev) => ({
                          ...prev,
                          skip: Math.max(0, prev.skip - prev.limit),
                        }))
                      }
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={!canNext || homeViewsFetching}
                      onClick={() =>
                        setHomeViewsApplied((prev) => ({
                          ...prev,
                          skip: prev.skip + prev.limit,
                        }))
                      }
                    >
                      Seguinte
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })()}
          </>
        )}
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
            <h2 className="font-semibold text-foreground text-lg">Cor da interface</h2>
            <p className="text-sm text-muted-foreground">
              Paletas monocromáticas só para a sua conta neste navegador (não altera o site público
              para visitantes).
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
                  setUserColorPalette(user?.id, p.id);
                  setPaletteId(p.id);
                  applySiteColorPalette(p.id);
                  toast.success("Preferência de cor guardada neste navegador.");
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
          Cada utilizador pode escolher um tom neutro diferente; o tema claro/escuro continua no
          ícone lua/sol da barra.
        </p>
      </motion.div>
    </div>
  );
}


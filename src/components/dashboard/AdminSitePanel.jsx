import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { uploadImageFile } from "@/lib/uploadImage";
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { getPageBackgroundUrl } from "@/lib/usePageBackground";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { PALETTE_OPTIONS, applySiteColorPalette } from "@/lib/colorPalettes";
import { purgeLegacyLocalAccounts } from "@/lib/purgeLegacyLocalAccounts";
import { useAuth } from "@/lib/AuthContext";

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
  const [paletteId, setPaletteId] = useState(
    () => getSiteConfig().colorPalette || "azul",
  );
  const [sessionTtl, setSessionTtl] = useState(120);
  const [loadingSessionTtl, setLoadingSessionTtl] = useState(true);
  const [savingSessionTtl, setSavingSessionTtl] = useState(false);
  const [purgingLocal, setPurgingLocal] = useState(false);
  const logoRef = useRef();

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
      setSiteConfig({ logoUrl: file_url });
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
      setSiteConfig({ pageBackgrounds: nextBg });
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
    setSiteConfig({ pageBackgrounds: nextBg });
    if (key === "login") setLoginHeroUrl("");
    else setLoginFormBgUrl("");
  };

  const handleToggleMenu = (key) => {
    const updated = { ...menuConfig, [key]: !menuConfig[key] };
    setMenuConfig(updated);
    localStorage.setItem("icer_member_menus", JSON.stringify(updated));
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
              Substitua a logo padrão por uma imagem personalizada
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
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo atual"
              className="h-12 w-auto rounded-lg border border-border object-contain"
            />
          )}
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
                setSiteConfig({ logoUrl: "" });
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
                  setSiteConfig({ colorPalette: p.id });
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


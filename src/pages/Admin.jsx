import { useState, useEffect, useRef } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { uploadImageFile } from "@/lib/uploadImage";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Lock,
  UserPlus,
  Users,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  CheckCircle,
  ImagePlus,
  Settings,
  FileText,
  Trash2,
  Search,
  Palette,
  ScrollText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "../components/shared/PageHeader";
import { isAdminUser, getUser } from "@/lib/auth";
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { getPageBackgroundUrl } from "@/lib/usePageBackground";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { PALETTE_OPTIONS, applySiteColorPalette } from "@/lib/colorPalettes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { purgeLegacyLocalAccounts } from "@/lib/purgeLegacyLocalAccounts";
import GlobalAuditLogPanel from "@/components/dashboard/GlobalAuditLogPanel";

const MEMBER_MENUS = [
  { key: "galeria", label: "Galeria de Fotos" },
  { key: "materiais_tab", label: "Materiais (na aba Recursos)" },
];

function GateAdmin() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">
          Acesso restrito
        </h2>
        <p className="text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    </div>
  );
}

// ── Aba Membros ───────────────────────────────────────────────
function TabMembros({ user, users, loadingUsers, refetch }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [updatingRole, setUpdatingRole] = useState({});
  const [togglingDisabled, setTogglingDisabled] = useState({});
  const [deletingUser, setDeletingUser] = useState({});
  const queryClient = useQueryClient();

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole((r) => ({ ...r, [userId]: true }));
    await api.entities.User.update(userId, { role: newRole });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setUpdatingRole((r) => ({ ...r, [userId]: false }));
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    const r = await api.users.inviteUser(inviteEmail.trim(), "user");
    const token = r?.invite_token;
    const link = token
      ? `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`
      : null;
    setInviteLink(link);
    setInviteSuccess(true);
    setInviteEmail("");
    setInviteLoading(false);
    setTimeout(() => setInviteSuccess(false), 3000);
    refetch();
  };

  const handleToggleDisabled = async (target) => {
    if (!target?.id) return;
    if (target.id === user?.id) return;
    const nextDisabled = !(target.disabled === true);
    setTogglingDisabled((r) => ({ ...r, [target.id]: true }));
    await api.entities.User.update(target.id, { disabled: nextDisabled });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setTogglingDisabled((r) => ({ ...r, [target.id]: false }));
  };

  const handleDeleteUser = async (target) => {
    if (!target?.id) return;
    if (target.id === user?.id) return;
    const ok = window.confirm(
      `Tem certeza que deseja remover o usuário "${target.email}"? Esta ação não pode ser desfeita.`,
    );
    if (!ok) return;
    setDeletingUser((r) => ({ ...r, [target.id]: true }));
    await api.entities.User.delete(target.id);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setDeletingUser((r) => ({ ...r, [target.id]: false }));
  };

  return (
    <div className="space-y-8">
      {/* Convidar membro */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-lg">
              Adicionar Membro
            </h2>
            <p className="text-sm text-muted-foreground">
              Envie um convite por e-mail para um novo membro
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="pl-9"
            />
          </div>
          <Button
            onClick={handleInvite}
            disabled={!inviteEmail.trim() || inviteLoading}
            className="shrink-0 gap-2"
          >
            {inviteLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Convidar</span>
          </Button>
        </div>
        {inviteSuccess && (
          <div className="mt-3 text-sm space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {inviteLink
                ? "Convite criado no servidor. Copie o link e envie ao novo membro para ele cadastrar a senha."
                : "Convite enviado com sucesso!"}
            </div>
            {inviteLink ? (
              <code className="block p-2 rounded-md bg-muted text-foreground break-all text-xs">
                {inviteLink}
              </code>
            ) : null}
          </div>
        )}
      </motion.div>

      {/* Lista de membros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Membros Cadastrados
              </h2>
              <p className="text-sm text-muted-foreground">
                {users.length} usuário(s)
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {loadingUsers ? (
          <div className="space-y-3">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhum usuário cadastrado.
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-xl gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.full_name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email}
                    </p>
                    {u.disabled === true ? (
                      <p className="text-[11px] mt-0.5 text-destructive">
                        Desativado
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {updatingRole[u.id] ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Select
                      value={u.role || "user"}
                      onValueChange={(val) =>
                        val !== u.role && handleRoleChange(u.id, val)
                      }
                      disabled={u.id === user?.id}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Membro</SelectItem>
                        <SelectItem value="admin">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={u.id === user?.id || togglingDisabled[u.id] === true}
                    onClick={() => handleToggleDisabled(u)}
                    className="h-8"
                    title={u.disabled === true ? "Reativar" : "Desativar"}
                  >
                    {togglingDisabled[u.id] ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : u.disabled === true ? (
                      "Reativar"
                    ) : (
                      "Desativar"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-destructive hover:text-destructive"
                    disabled={u.id === user?.id || deletingUser[u.id] === true}
                    onClick={() => handleDeleteUser(u)}
                    title="Remover"
                  >
                    {deletingUser[u.id] ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Aba Site ──────────────────────────────────────────────────
function TabSite() {
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
      {/* Logo */}
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
            <h2 className="font-semibold text-foreground text-lg">
              Logo do Site
            </h2>
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
            {uploadingLogo
              ? "Enviando..."
              : logoUrl
                ? "Trocar logo"
                : "Carregar logo"}
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

      {/* Sessão do site (servidor/MongoDB) */}
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
            <h2 className="font-semibold text-foreground text-lg">
              Tempo de sessão
            </h2>
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
            {savingSessionTtl ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : null}
            Salvar
          </Button>
        </div>
      </motion.div>

      {/* Página de login — só administradores acedem a esta área */}
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
            <h2 className="font-semibold text-foreground text-lg">
              Página de login
            </h2>
            <p className="text-sm text-muted-foreground">
              Fundo do cabeçalho (hero) e fundo da zona do formulário — guardado
              neste navegador
            </p>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              1. Cabeçalho (hero)
            </p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="login-hero-bg"
              onChange={(e) => applyLoginBackground(e, "login")}
            />
            {loginHeroUrl ? (
              <div className="h-24 rounded-lg border border-border overflow-hidden bg-muted">
                <img
                  src={loginHeroUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
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
            <p className="text-sm font-medium text-foreground">
              2. Zona do formulário
            </p>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="login-form-bg"
              onChange={(e) => applyLoginBackground(e, "login_form")}
            />
            {loginFormBgUrl ? (
              <div className="h-24 rounded-lg border border-border overflow-hidden bg-muted">
                <img
                  src={loginFormBgUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma imagem</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("login-form-bg")?.click()
                }
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

      {/* Visibilidade de menus */}
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
                  onClick={() => handleToggleMenu(menu.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-accent" : "bg-muted-foreground/30"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          * As configurações são salvas localmente e aplicadas ao menu de
          navegação.
        </p>
      </motion.div>

      {/* Paleta geral (substitui o tema azul padrão) */}
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
            <h2 className="font-semibold text-foreground text-lg">
              Cor geral do site
            </h2>
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
          A paleta é guardada neste navegador (localStorage) com as permissões
          de menus.
        </p>
      </motion.div>

      {/* Sessões ativas */}
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

      {/* Limpeza de usuários locais antigos */}
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

// ── Aba Logs ───────────────────────────────────────────────────
function TabLogs() {
  return <GlobalAuditLogPanel />;
}

// ── Aba Conteúdo ──────────────────────────────────────────────
function TabConteudo() {
  const queryClient = useQueryClient();
  const [searchPosts, setSearchPosts] = useState("");

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: () => api.entities.Post.list("-created_date", 100),
  });

  const deletePost = useMutation({
    mutationFn: (id) => api.entities.Post.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
  });

  const filteredPosts = posts.filter(
    (p) =>
      p.titulo?.toLowerCase().includes(searchPosts.toLowerCase()) ||
      p.autor?.toLowerCase().includes(searchPosts.toLowerCase()),
  );

  const categoriaColors = {
    devocional:
      "border border-accent/30 bg-accent/10 text-accent dark:border-accent/35 dark:bg-accent/15",
    aviso: "border border-primary/25 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/15",
    testemunho:
      "border border-category-estudo/30 bg-category-estudo/10 text-category-estudo dark:border-category-estudo/35 dark:bg-category-estudo/12",
    reflexao:
      "border border-category-jovens/30 bg-category-jovens/10 text-category-jovens dark:border-category-jovens/35 dark:bg-category-jovens/12",
    noticias:
      "border border-category-mulheres/30 bg-category-mulheres/10 text-category-mulheres dark:border-category-mulheres/35 dark:bg-category-mulheres/12",
  };

  return (
    <div className="space-y-8">
      {/* Posts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Posts Publicados
              </h2>
              <p className="text-sm text-muted-foreground">
                {posts.length} post(s)
              </p>
            </div>
          </div>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar posts..."
            value={searchPosts}
            onChange={(e) => setSearchPosts(e.target.value)}
            className="pl-9"
          />
        </div>
        {loadingPosts ? (
          <div className="space-y-2">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            Nenhum post encontrado.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-xl gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {post.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {post.categoria && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded border ${categoriaColors[post.categoria] || ""}`}
                      >
                        {post.categoria}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(post.created_date), "d MMM yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                    {!post.publicado && (
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        Rascunho
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive w-8 h-8"
                  onClick={() => deletePost.mutate(post.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [activeTab, setActiveTab] = useState("membros");

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener("icer-user-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("icer-user-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const {
    data: users = [],
    isLoading: loadingUsers,
    refetch,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.entities.User.list(),
    enabled: isAdminUser(user),
  });

  if (user === undefined) {
    return (
      <div>
        <PageHeader
          pageKey="admin"
          tag="Admin"
          title="Painel Administrativo"
        />
        <div className="max-w-4xl mx-auto px-4 py-20 space-y-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div>
        <PageHeader
          pageKey="admin"
          tag="Admin"
          title="Painel Administrativo"
        />
        <GateAdmin />
      </div>
    );
  }

  const tabs = [
    { key: "membros", label: "Membros", icon: Users },
    { key: "conteudo", label: "Conteúdo", icon: FileText },
    { key: "site", label: "Site", icon: Settings },
    { key: "logs", label: "Logs", icon: ScrollText },
  ];

  return (
    <div>
      <PageHeader
        pageKey="admin"
        tag="Administração"
        title="Painel Administrativo"
        description="Gerencie membros, acessos e configurações do site."
      />

      <section className="py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-10 w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-card shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "membros" && (
            <TabMembros
              user={user}
              users={users}
              loadingUsers={loadingUsers}
              refetch={refetch}
            />
          )}
          {activeTab === "conteudo" && <TabConteudo />}
          {activeTab === "site" && <TabSite />}
          {activeTab === "logs" && <TabLogs />}
        </div>
      </section>
    </div>
  );
}

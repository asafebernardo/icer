import { useState, useEffect } from "react";

import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "../components/shared/PageHeader";
import AdminSettingsShell from "@/components/admin/AdminSettingsShell";
import AdminMembrosPanel from "@/components/dashboard/AdminMembrosPanel";
import { isAdminUser, getUser } from "@/lib/auth";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import UserAvatar from "@/components/shared/UserAvatar";

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
  const [inviteTempPw, setInviteTempPw] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [updatingRole, setUpdatingRole] = useState({});
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
    await api.users.inviteUser(inviteEmail.trim(), "user");
    setInviteSuccess(true);
    setInviteEmail("");
    setInviteLoading(false);
    setTimeout(() => setInviteSuccess(false), 3000);
    refetch();
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
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {inviteLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span className="ml-2 hidden sm:inline">Convidar</span>
          </Button>
        </div>
        {inviteSuccess && (
          <div className="mt-3 text-sm space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {inviteTempPw
                ? "Utilizador criado no servidor. Guarde a palavra-passe e envie-a ao novo membro."
                : "Convite enviado com sucesso!"}
            </div>
            {inviteTempPw ? (
              <code className="block p-2 rounded-md bg-muted text-foreground break-all text-xs">
                {inviteTempPw}
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
                  </div>
                </div>
                <div className="shrink-0">
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
  const logoRef = useRef();

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

  const handleToggleMenu = (key) => {
    const updated = { ...menuConfig, [key]: !menuConfig[key] };
    setMenuConfig(updated);
    localStorage.setItem("icer_member_menus", JSON.stringify(updated));
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
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`}
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
    </div>
  );
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
    devocional: "bg-amber-50 text-amber-700 border-amber-200",
    aviso: "bg-blue-50 text-blue-700 border-blue-200",
    testemunho: "bg-green-50 text-green-700 border-green-200",
    reflexao: "bg-purple-50 text-purple-700 border-purple-200",
    noticias: "bg-rose-50 text-rose-700 border-rose-200",
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

  if (user === undefined) {
    return (
      <div>
        <PageHeader tag="Admin" title="Painel administrativo" pageKey="admin" />
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-20">
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
        <PageHeader tag="Admin" title="Painel administrativo" pageKey="admin" />
        <GateAdmin />
      </div>
    );
  }

  const serverControlsEnabled =
    isAdminUser(user) && isServerAuthEnabled() && user?._authSource === "server";

  return (
    <div>
      <PageHeader
        tag="Administração"
        title="Painel administrativo"
        description="Perfil, utilizadores, grupos de permissão, site, Google, servidor, segurança e restantes opções."
        pageKey="admin"
      />

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <UserAvatar user={user} className="h-10 w-10" />
          <div>
            <span className="text-muted-foreground">Sessão:</span>{" "}
            <span className="font-medium text-foreground">{user.full_name || user.email}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-foreground">{user.email}</span>
          </div>
        </div>

        <AdminSettingsShell
          tabMembrosSlot={
            <AdminMembrosPanel adminUser={user} serverControlsEnabled={serverControlsEnabled} />
          }
        />
      </div>
    </div>
  );
}

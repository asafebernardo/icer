import { useState, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Lock,
  UserPlus,
  Users,
  Mail,
  RefreshCw,
  CheckCircle,
  FileText,
  Trash2,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "../components/shared/PageHeader";
import AdminSettingsShell from "@/components/admin/AdminSettingsShell";
import { isAdminUser, getUser } from "@/lib/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [togglingDisabled, setTogglingDisabled] = useState({});
  const [deletingUser, setDeletingUser] = useState({});
  const queryClient = useQueryClient();

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    const r = await api.users.inviteUser(inviteEmail.trim());
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
                  <UserAvatar user={u} className="h-9 w-9 shrink-0" showTwoFactorBadge={false} />
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
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>

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

// ── Aba Conteúdo ──────────────────────────────────────────────
function TabConteudo() {
  const queryClient = useQueryClient();
  const [searchPosts, setSearchPosts] = useState("");

  const { data, isLoading: loadingPosts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: () => api.entities.Post.list("-created_date", 100),
  });

  const posts = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : [];

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

  return (
    <div>
      <PageHeader
        tag="Administração"
        title="Painel administrativo"
        description="Perfil, membros, conteúdo, site, segurança e restantes opções."
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
            <TabMembros
              user={user}
              users={users}
              loadingUsers={loadingUsers}
              refetch={refetch}
            />
          }
          tabConteudoSlot={<TabConteudo />}
        />
      </div>
    </div>
  );
}

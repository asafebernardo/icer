import { useMemo, useState } from "react";
import { fetchJson } from "@/lib/serverAuth";
import { splitAllowedEmails } from "@/lib/googleAllowedEmails";
import GoogleAllowedEmailsEditor from "@/components/admin/GoogleAllowedEmailsEditor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/AuthContext";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import {
  Users,
  RefreshCw,
  Shield,
  UserCog,
  ScrollText,
  Trash2,
  User as UserIcon,
  Mail,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  labelForAction,
  formatAuditDetails,
  categoryForAction,
  initialsFromIdentity,
} from "@/lib/auditLogLabels";
import { formatAdminUserDeleteError } from "@/lib/adminUserDeleteMessages";
import UserAvatar from "@/components/shared/UserAvatar";
import EmptyState from "@/components/shared/EmptyState";
import {
  passwordPolicyErrorMessagePt,
  isAccountPasswordPolicyCode,
} from "@/lib/passwordPolicy";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function mapPanelApiErrorMessage(msg) {
  const m = String(msg || "");
  if (isAccountPasswordPolicyCode(m)) return passwordPolicyErrorMessagePt(m);
  return m;
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

function mapUserGroupSaveError(msg) {
  const m = String(msg || "");
  if (m === "invalid_permission_group") {
    return "O grupo já não existe ou é inválido. Atualize a lista de grupos.";
  }
  return m;
}

async function fetchPermissionGroups() {
  const r = await fetch("/api/admin/permission-groups", { credentials: "include" });
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

async function fetchUserAuditLog(userId) {
  const r = await fetch(`/api/admin/users/${userId}/audit-log?limit=100`, {
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

/**
 * Lista de membros + ações (modo servidor: conta Google, grupo, atividade, etc.).
 * @param {{ adminUser: object; serverControlsEnabled: boolean }} props
 */
export default function AdminMembrosPanel({ adminUser, serverControlsEnabled }) {
  const { user: sessionUser } = useAuth();
  const qc = useQueryClient();
  const [togglingDisabled, setTogglingDisabled] = useState({});
  const [allowedEmailDraft, setAllowedEmailDraft] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);
  const [panelMsg, setPanelMsg] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityUserId, setActivityUserId] = useState(null);
  const [activityUserLabel, setActivityUserLabel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data: users = [], isLoading, refetch, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.entities.User.list(),
    enabled: !!adminUser && adminUser.role === "admin",
  });

  const { data: googleConfig } = useQuery({
    queryKey: ["admin-google-login-config"],
    queryFn: () => fetchJson("/admin/google-login/config", { method: "GET" }),
    enabled: serverControlsEnabled,
  });

  const allowedEmails = useMemo(() => {
    if (!googleConfig) return [];
    const raw = Array.isArray(googleConfig.allowed_emails)
      ? googleConfig.allowed_emails
      : googleConfig.allowed_emails_text;
    return splitAllowedEmails(
      Array.isArray(raw) ? raw.join(",") : String(raw || ""),
    );
  }, [googleConfig]);

  const {
    data: permissionGroups = [],
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["admin-permission-groups"],
    queryFn: fetchPermissionGroups,
    enabled: serverControlsEnabled,
  });

  const sortedGroups = useMemo(
    () =>
      [...permissionGroups].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "pt", {
          sensitivity: "base",
          numeric: true,
        }),
      ),
    [permissionGroups],
  );

  const updateUserGroupMut = useMutation({
    mutationFn: async ({ id, permission_group_id }) => {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
        body: JSON.stringify({ permission_group_id }),
      });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = { message: t };
      }
      if (!r.ok) {
        throw new Error(mapUserGroupSaveError(data.message) || r.statusText);
      }
    },
    onSuccess: () => {
      toast.success("Grupo de permissões atualizado.");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e?.message || "Não foi possível atualizar o grupo."),
  });

  const userById = new Map((users || []).map((u) => [u.id, u]));

  const {
    data: auditRows = [],
    isLoading: auditLoading,
    error: auditError,
  } = useQuery({
    queryKey: ["server-user-audit", activityUserId],
    queryFn: () => fetchUserAuditLog(activityUserId),
    enabled: serverControlsEnabled && activityOpen && activityUserId != null,
  });

  const handleToggleDisabled = async (target) => {
    if (!target?.id) return;
    if (target.id === adminUser?.id) return;
    const nextDisabled = !(target.disabled === true);
    setTogglingDisabled((r) => ({ ...r, [target.id]: true }));
    try {
      await api.entities.User.update(target.id, { disabled: nextDisabled });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    } finally {
      setTogglingDisabled((r) => ({ ...r, [target.id]: false }));
    }
  };

  const mapGoogleAccountError = (msg) => {
    const m = String(msg || "");
    if (m === "invalid_allowed_email") return "E-mail inválido.";
    if (m === "invalid_request") return "Dados inválidos.";
    return mapPanelApiErrorMessage(m);
  };

  const handleAddGoogleAccount = async (email) => {
    setCreateMsg(null);
    setCreateBusy(true);
    try {
      const r = await fetch("/api/admin/users/google-account", {
        method: "POST",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email }),
      });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = { message: t };
      }
      if (!r.ok) {
        throw new Error(mapGoogleAccountError(data.message) || r.statusText);
      }
      setAllowedEmailDraft("");
      setCreateMsg({
        type: "ok",
        text: data.created
          ? "Conta Google criada e autorizada."
          : "E-mail autorizado (conta já existia).",
      });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      await qc.invalidateQueries({ queryKey: ["admin-google-login-config"] });
    } catch (e) {
      setCreateMsg({
        type: "err",
        text: e?.message || "Não foi possível adicionar a conta Google.",
      });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleRemoveAllowedEmail = async (email) => {
    setCreateMsg(null);
    setCreateBusy(true);
    try {
      const r = await fetch("/api/admin/google-login/allowed-emails", {
        method: "DELETE",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email }),
      });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = { message: t };
      }
      if (!r.ok) {
        throw new Error(mapGoogleAccountError(data.message) || r.statusText);
      }
      toast.success("E-mail removido da lista de autorizados.");
      await qc.invalidateQueries({ queryKey: ["admin-google-login-config"] });
    } catch (e) {
      setCreateMsg({
        type: "err",
        text: e?.message || "Não foi possível remover o e-mail autorizado.",
      });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget == null) return;
    if (deleteTarget.id === adminUser?.id) return;
    setDeleteBusy(true);
    setPanelMsg(null);
    try {
      if (serverControlsEnabled) {
        const r = await fetch(`/api/admin/users/${deleteTarget.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: await withCsrfHeaderAsync(),
        });
        const t = await r.text();
        let data = {};
        try {
          data = t ? JSON.parse(t) : {};
        } catch {
          data = { message: t };
        }
        if (!r.ok) {
          throw new Error(formatAdminUserDeleteError(data.message || t));
        }
      } else {
        await api.entities.User.delete(deleteTarget.id);
      }
      setDeleteTarget(null);
      toast.success("Conta removida.");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      setPanelMsg({
        type: "err",
        text: e?.message || "Não foi possível eliminar a conta.",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const showServerAuthHint = isServerAuthEnabled() && !serverControlsEnabled;

  return (
    <div className="space-y-8">
      {showServerAuthHint ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Users className="h-4 w-4 shrink-0" />
            Sessão sem MongoDB
          </div>
          <p className="mt-2">
            Com <code className="rounded bg-muted px-1 text-xs">VITE_USE_SERVER_AUTH=true</code>{" "}
            inicie sessão com uma conta da base para adicionar contas Google, ver atividade,
            gerir grupos de permissão por utilizador.
          </p>
        </div>
      ) : null}

      {serverControlsEnabled ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Nova conta Google</h2>
              <p className="text-xs text-muted-foreground">
                Gmail autorizado para login Google.
              </p>
            </div>
          </div>
          <GoogleAllowedEmailsEditor
            id="mbr-google-allowed"
            emails={allowedEmails}
            draft={allowedEmailDraft}
            onDraftChange={setAllowedEmailDraft}
            onEmailsChange={() => {}}
            onAddEmail={handleAddGoogleAccount}
            onRemoveEmail={handleRemoveAllowedEmail}
            disabled={createBusy}
            label="E-mails autorizados (login Google)"
            hint="E-mail + Enter. Remover bloqueia novo login Google."
          />
          {createMsg ? (
            <p
              className={`mt-3 text-sm ${createMsg.type === "ok" ? "text-green-600" : "text-destructive"}`}
            >
              {createMsg.text}
            </p>
          ) : null}
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: serverControlsEnabled ? 0.05 : 0 }}
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Users className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Membros cadastrados</h2>
              <p className="text-xs text-muted-foreground">
                {users.length} utilizador(es)
                {serverControlsEnabled
                  ? " · contas na base de dados do site"
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="icon" title="Atualizar lista" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {serverControlsEnabled ? (
              <Button
                variant="outline"
                size="icon"
                title="Atualizar grupos de permissão"
                onClick={() => refetchGroups()}
                disabled={groupsLoading}
              >
                <RefreshCw className={cn("h-4 w-4", groupsLoading && "animate-spin")} />
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-sm text-destructive">{error.message || "Erro ao carregar lista."}</p>
        ) : null}
        {serverControlsEnabled && groupsError ? (
          <p className="mb-4 text-sm text-destructive">
            Grupos: {groupsError.message || "Erro ao carregar."}
          </p>
        ) : null}
        {panelMsg?.type === "err" ? (
          <p className="mb-4 text-sm text-destructive">{panelMsg.text}</p>
        ) : null}

        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum utilizador cadastrado"
            description="Quando alguém se registar ou for criado aqui, aparece nesta lista."
            compact
          />
        ) : serverControlsEnabled ? (
          <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
            {users.map((u) => {
              const isSelf =
                sessionUser?.id != null && Number(sessionUser.id) === Number(u.id);
              const isAdminRole = String(u.role || "").toLowerCase() === "admin";
              const groupValue =
                u.permission_group_id != null && u.permission_group_id !== ""
                  ? String(u.permission_group_id)
                  : "none";
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1.5 bg-card px-2.5 py-2 sm:gap-x-3 sm:px-3 sm:py-2"
                >
                  <UserAvatar user={u} className="h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1 basis-[10rem]">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="truncate text-sm font-medium text-foreground">
                        {u.full_name || "—"}
                      </span>
                      {isAdminRole ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                          <Shield className="h-2.5 w-2.5" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <UserCog className="h-2.5 w-2.5" />
                          {u.role || "Conta"}
                        </span>
                      )}
                      {u.login_via_google === true ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                          <Mail className="h-2.5 w-2.5" />
                          Google
                        </span>
                      ) : null}
                      {u.disabled === true ? (
                        <span className="text-[10px] font-medium text-destructive">Off</span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Select
                    value={groupValue}
                    disabled={
                      groupsLoading ||
                      !!groupsError ||
                      (updateUserGroupMut.isPending &&
                        updateUserGroupMut.variables?.id === u.id)
                    }
                    onValueChange={(v) => {
                      const next = v === "none" ? null : Number.parseInt(v, 10);
                      if (
                        (u.permission_group_id == null || u.permission_group_id === "") &&
                        v === "none"
                      ) {
                        return;
                      }
                      if (
                        u.permission_group_id != null &&
                        String(u.permission_group_id) === v
                      ) {
                        return;
                      }
                      updateUserGroupMut.mutate({ id: u.id, permission_group_id: next });
                    }}
                  >
                    <SelectTrigger
                      id={`pg-select-${u.id}`}
                      className="h-8 w-full min-w-[9.5rem] max-w-[11.5rem] text-xs"
                      aria-label={`Grupo de ${u.full_name || u.email}`}
                    >
                      <SelectValue placeholder="Grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem grupo</SelectItem>
                      {sortedGroups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Ver atividade"
                      onClick={() => {
                        setActivityUserId(u.id);
                        setActivityUserLabel(u.full_name || u.email || `ID ${u.id}`);
                        setActivityOpen(true);
                      }}
                    >
                      <ScrollText className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={u.id === adminUser?.id || togglingDisabled[u.id] === true}
                      title={u.disabled === true ? "Reativar" : "Desativar"}
                      onClick={() => void handleToggleDisabled(u)}
                    >
                      {togglingDisabled[u.id] ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={isSelf}
                      title={
                        isSelf ? "Não pode eliminar a sua própria sessão" : "Eliminar conta"
                      }
                      onClick={() =>
                        setDeleteTarget({
                          id: u.id,
                          label: u.full_name || u.email || `ID ${u.id}`,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
            {users.map((u) => {
              const name = String(u.full_name || "").trim();
              const email = String(u.email || "").trim();
              const line1 = name || email || "—";
              const line2 = name && email ? email : null;
              const isSelf = u.id === adminUser?.id;
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center gap-2 bg-card px-2.5 py-2 sm:px-3"
                >
                  <UserAvatar user={u} className="h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{line1}</p>
                    {line2 ? (
                      <p className="truncate text-xs text-muted-foreground">{line2}</p>
                    ) : null}
                    {u.disabled === true ? (
                      <p className="text-[10px] text-destructive">Desativado</p>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                    <Shield className="h-2.5 w-2.5" />
                    Admin
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isSelf || togglingDisabled[u.id] === true}
                      title={u.disabled === true ? "Reativar" : "Desativar"}
                      onClick={() => void handleToggleDisabled(u)}
                    >
                      {togglingDisabled[u.id] ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={isSelf}
                      title="Remover"
                      onClick={() =>
                        setDeleteTarget({
                          id: u.id,
                          label: u.full_name || u.email || u.id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {serverControlsEnabled ? (
        <Dialog
          open={activityOpen}
          onOpenChange={(open) => {
            setActivityOpen(open);
            if (!open) {
              setActivityUserId(null);
              setActivityUserLabel("");
            }
          }}
        >
          <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
            <DialogHeader className="px-6 pb-2 pt-6">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <ScrollText className="h-5 w-5 shrink-0" />
                Atividade — {activityUserLabel || "—"}
              </DialogTitle>
              <p className="pt-1 text-sm font-normal text-muted-foreground">
                Registos recentes associados a este utilizador.
              </p>
            </DialogHeader>
            <ScrollArea className="max-h-[min(60vh,520px)] px-6 pb-6">
              {auditLoading ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : null}
              {auditError ? (
                <p className="py-4 text-sm text-destructive">
                  {auditError.message || "Não foi possível carregar os registos."}
                </p>
              ) : null}
              {!auditLoading && !auditError && (!auditRows || auditRows.length === 0) ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Ainda não há registos para este utilizador.
                </p>
              ) : null}
              {!auditLoading && !auditError && auditRows?.length > 0 ? (
                <div className="space-y-3 pr-2">
                  {auditRows.map((row) => {
                    const actorId = row.actor_user_id;
                    const subjectId = row.user_id;
                    const actor = actorId != null ? userById.get(actorId) : null;
                    const subject = subjectId != null ? userById.get(subjectId) : null;
                    const actorOther =
                      actorId != null && subjectId != null && actorId !== subjectId;
                    const actorIdentity =
                      actor?.full_name || actor?.email || (actorId != null ? `#${actorId}` : null);
                    const subjectIdentity =
                      subject?.full_name ||
                      subject?.email ||
                      (subjectId != null ? `#${subjectId}` : "—");
                    const principal = actor || subject;
                    const principalIdentity = actorIdentity || subjectIdentity;
                    const category = categoryForAction(row.action);
                    const Icon = category.icon;
                    return (
                      <div
                        key={row.id}
                        className={`rounded-xl border border-border bg-card p-3 text-sm shadow-sm ${category.accentClass}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 shrink-0 border border-border bg-muted">
                            {principal?.avatar_url ? (
                              <AvatarImage
                                src={principal.avatar_url}
                                alt={principalIdentity || "Utilizador"}
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                            <AvatarFallback className="text-[11px] font-semibold text-muted-foreground">
                              {principal ? (
                                initialsFromIdentity(principalIdentity)
                              ) : (
                                <UserIcon className="h-4 w-4" aria-hidden />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${category.badgeClass}`}
                              >
                                <Icon className={`h-3 w-3 ${category.iconClass}`} aria-hidden />
                                {category.label}
                              </span>
                              <span className="font-medium text-foreground">
                                {labelForAction(row.action)}
                              </span>
                              <span className="ml-auto whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                                {formatTs(row.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {principalIdentity || "—"}
                              </span>
                              {actorOther ? (
                                <>
                                  {" "}
                                  <span aria-hidden>→</span>{" "}
                                  <span className="font-medium text-foreground">
                                    {subjectIdentity}
                                  </span>
                                </>
                              ) : null}
                              <span className="mx-1.5 opacity-50">·</span>
                              <span className="font-mono">{row.ip || "—"}</span>
                            </p>
                            <pre className="whitespace-pre-wrap break-all rounded-md border border-border/60 bg-background/80 p-2 font-mono text-[11px] leading-snug text-muted-foreground">
                              {formatAuditDetails(row.details)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto remove{" "}
              <span className="font-medium text-foreground">{deleteTarget?.label || "—"}</span>
              {serverControlsEnabled
                ? " da base de dados e invalida as sessões. Não pode ser desfeito."
                : " da lista de membros. Não pode ser desfeito."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleteBusy ? "A eliminar…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

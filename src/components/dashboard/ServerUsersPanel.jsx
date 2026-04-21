import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, RefreshCw, Shield, KeyRound, ScrollText } from "lucide-react";
import {
  labelForAction,
  formatAuditDetails,
} from "@/lib/auditLogLabels";

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

async function fetchServerUsers() {
  const r = await fetch("/api/admin/users", { credentials: "include" });
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
  const r = await fetch(
    `/api/admin/users/${userId}/audit-log?limit=100`,
    { credentials: "include" },
  );
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

export default function ServerUsersPanel() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [resetPass, setResetPass] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityUserId, setActivityUserId] = useState(null);
  const [activityUserLabel, setActivityUserLabel] = useState("");

  const { data: users = [], isLoading, refetch, error } = useQuery({
    queryKey: ["server-admin-users"],
    queryFn: fetchServerUsers,
  });

  const emailById = Object.fromEntries(
    (users || []).map((u) => [u.id, u.email]),
  );

  const {
    data: auditRows = [],
    isLoading: auditLoading,
    error: auditError,
  } = useQuery({
    queryKey: ["server-user-audit", activityUserId],
    queryFn: () => fetchUserAuditLog(activityUserId),
    enabled: activityOpen && activityUserId != null,
  });

  const handleCreate = async () => {
    setMsg(null);
    if (!email.trim() || !fullName.trim() || password.length < 10) {
      setMsg({
        type: "err",
        text: "Preencha e-mail, nome e palavra-passe (mín. 10 caracteres).",
      });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role,
          password,
        }),
      });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = { message: t };
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText);
      }
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("user");
      setMsg({ type: "ok", text: "Utilizador criado." });
      await qc.invalidateQueries({ queryKey: ["server-admin-users"] });
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.message || "Não foi possível criar o utilizador.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (id) => {
    if (!resetPass || resetPass.length < 10) {
      setMsg({
        type: "err",
        text: "Nova palavra-passe com pelo menos 10 caracteres.",
      });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPass }),
      });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = { message: t };
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText);
      }
      setResetId(null);
      setResetPass("");
      setMsg({ type: "ok", text: "Palavra-passe atualizada." });
      await refetch();
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.message || "Falha ao atualizar palavra-passe.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Contas no servidor
              </h2>
              <p className="text-sm text-muted-foreground">
                Utilizadores no servidor (MongoDB + sessão). Apenas
                administradores.
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-4">
            {error.message || "Erro ao carregar lista."}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma conta encontrada.
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">
                      {u.full_name || "—"}
                    </span>
                    {u.role === "admin" && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {u.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Criado: {formatTs(u.created_at)} · Atualizado:{" "}
                    {formatTs(u.updated_at)}
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  {resetId === u.id ? (
                    <div className="flex flex-col gap-2 w-full sm:w-64">
                      <Input
                        type="password"
                        placeholder="Nova palavra-passe (mín. 10)"
                        value={resetPass}
                        onChange={(e) => setResetPass(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleResetPassword(u.id)}
                          disabled={busy}
                        >
                          <KeyRound className="w-4 h-4 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setResetId(null);
                            setResetPass("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActivityUserId(u.id);
                          setActivityUserLabel(
                            u.full_name || u.email || `ID ${u.id}`,
                          );
                          setActivityOpen(true);
                        }}
                      >
                        <ScrollText className="w-4 h-4 mr-1" />
                        Ver atividade
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResetId(u.id);
                          setResetPass("");
                        }}
                      >
                        Redefinir palavra-passe
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

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
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <ScrollText className="w-5 h-5 shrink-0" />
              Atividade — {activityUserLabel || "—"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal pt-1">
              Registos recentes associados a este utilizador (início de sessão,
              alterações e ações no servidor).
            </p>
          </DialogHeader>
          <ScrollArea className="max-h-[min(60vh,520px)] px-6 pb-6">
            {auditLoading && (
              <div className="space-y-2 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            )}
            {auditError && (
              <p className="text-sm text-destructive py-4">
                {auditError.message || "Não foi possível carregar os registos."}
              </p>
            )}
            {!auditLoading &&
              !auditError &&
              (!auditRows || auditRows.length === 0) && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Ainda não há registos para este utilizador.
                </p>
              )}
            {!auditLoading &&
              !auditError &&
              auditRows?.length > 0 && (
                <div className="space-y-3 pr-2">
                  {auditRows.map((row) => {
                    const actorId = row.actor_user_id;
                    const subjectId = row.user_id;
                    const actorOther =
                      actorId != null &&
                      subjectId != null &&
                      actorId !== subjectId;
                    const actorLabel =
                      actorOther && emailById[actorId]
                        ? emailById[actorId]
                        : actorOther
                          ? `#${actorId}`
                          : null;
                    return (
                      <div
                        key={row.id}
                        className="border border-border rounded-xl p-3 text-sm space-y-1.5 bg-muted/30"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {labelForAction(row.action)}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatTs(row.created_at)}
                          </span>
                        </div>
                        {actorLabel && (
                          <p className="text-xs text-muted-foreground">
                            Executado por: {actorLabel}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground break-all">
                          IP: {row.ip || "—"}
                        </p>
                        <pre className="text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap break-all font-mono bg-background/80 rounded-md p-2 border border-border/60">
                          {formatAuditDetails(row.details)}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <h2 className="font-semibold text-foreground text-lg mb-1">
          Novo utilizador
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          A palavra-passe inicial deve ter pelo menos 10 caracteres (requisito do
          servidor).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="srv-email">E-mail</Label>
            <Input
              id="srv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srv-name">Nome completo</Label>
            <Input
              id="srv-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome"
            />
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Utilizador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="srv-pass">Palavra-passe inicial</Label>
            <Input
              id="srv-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 10 caracteres"
            />
          </div>
        </div>
        <Button className="mt-4" onClick={handleCreate} disabled={busy}>
          Criar utilizador
        </Button>
        {msg && (
          <p
            className={`text-sm mt-3 ${msg.type === "ok" ? "text-green-600" : "text-destructive"}`}
          >
            {msg.text}
          </p>
        )}
      </motion.div>
    </div>
  );
}

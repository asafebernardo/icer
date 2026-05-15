import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cloud, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PasswordRevealInput from "@/components/shared/PasswordRevealInput";
import { toast } from "sonner";
import { withCsrfHeaderAsync } from "@/lib/csrf";

function mapGoogleConnectError(msg) {
  const m = String(msg || "");
  if (m === "google_not_configured") {
    return "Active «Integração ativa», preencha Client ID e Client secret e clique em «Guardar» antes de conectar.";
  }
  if (m === "google_public_base_missing") {
    return "No servidor falta ICER_PUBLIC_BASE_URL (URL pública do site, ex. https://icer.com.br) para o redirect OAuth.";
  }
  if (m === "2fa_required") {
    return "Complete a configuração 2FA (aba 2FA do Dashboard) para continuar.";
  }
  return m || "Não foi possível iniciar OAuth.";
}

const emptyForm = {
  enabled: false,
  client_id: "",
  client_secret: "",
  drive_export_folder_id: "",
  auto_upload_backups: false,
  notes: "",
};

export default function GoogleIntegrationPanel() {
  const [form, setForm] = useState(emptyForm);
  const [clientSecretSet, setClientSecretSet] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [oauthStatus, setOauthStatus] = useState({ connected: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/integrations/google", { credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data.message || r.statusText);
      }
      setForm({
        enabled: data.enabled === true,
        client_id: data.client_id || "",
        client_secret: "",
        drive_export_folder_id: data.drive_export_folder_id || "",
        auto_upload_backups: data.auto_upload_backups === true,
        notes: data.notes || "",
      });
      setClientSecretSet(!!data.client_secret_set);
      setUpdatedAt(data.updated_at || null);

      const rs = await fetch("/api/admin/integrations/google/status", { credentials: "include" });
      const st = await rs.json().catch(() => ({}));
      if (rs.ok) setOauthStatus(st);
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar as definições.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        enabled: form.enabled,
        client_id: form.client_id.trim(),
        drive_export_folder_id: form.drive_export_folder_id.trim(),
        auto_upload_backups: form.auto_upload_backups === true,
        notes: form.notes,
      };
      if (form.client_secret.trim()) {
        body.client_secret = form.client_secret.trim();
      }
      const r = await fetch("/api/admin/integrations/google", {
        method: "PUT",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data.message || r.statusText);
      }
      setForm((f) => ({ ...f, client_secret: "" }));
      setClientSecretSet(!!data.client_secret_set);
      setUpdatedAt(data.updated_at || null);
      toast.success("Definições Google guardadas.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  };

  const connect = async () => {
    if (!form.enabled) {
      toast.error(
        "Active «Integração ativa» (interruptor acima) e guarde as credenciais com «Guardar» antes de conectar.",
      );
      return;
    }
    if (!form.client_id.trim()) {
      toast.error("Preencha o OAuth Client ID e guarde com «Guardar».");
      return;
    }
    if (!clientSecretSet && !form.client_secret.trim()) {
      toast.error("Indique o Client secret (ou guarde um secret já definido no servidor).");
      return;
    }
    setConnecting(true);
    try {
      const r = await fetch("/api/auth/google/start", { credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(mapGoogleConnectError(data.message || r.statusText));
        return;
      }
      if (!data.auth_url) {
        toast.error("Resposta inválida do servidor (auth_url em falta).");
        return;
      }
      window.location.assign(data.auth_url);
    } catch (e) {
      toast.error(e?.message || "Não foi possível iniciar OAuth.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    const ok = window.confirm("Desconectar a conta Google deste servidor?");
    if (!ok) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/integrations/google/disconnect", {
        method: "POST",
        credentials: "include",
        headers: await withCsrfHeaderAsync(),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || r.statusText);
      setOauthStatus({ connected: false });
      toast.success("Conta Google desconectada.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível desconectar.");
    } finally {
      setSaving(false);
    }
  };

  const clearSecret = async () => {
    if (!clientSecretSet) return;
    const ok = window.confirm("Remover o Client secret guardado no servidor?");
    if (!ok) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/integrations/google", {
        method: "PUT",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
        body: JSON.stringify({ clear_client_secret: true }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data.message || r.statusText);
      }
      setClientSecretSet(false);
      setUpdatedAt(data.updated_at || null);
      toast.success("Client secret removido.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível remover.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        A carregar…
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6 space-y-6 max-w-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-lg">Integração Google</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Credenciais OAuth (Google Cloud Console), pasta do Drive (ID na URL) e ligação
            da conta para backups. Em produção defina também{" "}
            <code className="text-xs bg-muted px-1 rounded">ICER_PUBLIC_BASE_URL</code> no
            servidor para o redirect OAuth funcionar.
          </p>
          {updatedAt ? (
            <p className="text-xs text-muted-foreground mt-2">Última alteração: {updatedAt}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Integração ativa</p>
          <p className="text-xs text-muted-foreground">
            Tem de estar activo para guardar credenciais e para o botão «Conectar conta Google».
          </p>
        </div>
        <Switch
          checked={form.enabled}
          onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Conta conectada</p>
          <p className="text-xs text-muted-foreground">
            {oauthStatus?.connected
              ? `Conectado${oauthStatus.connected_email ? `: ${oauthStatus.connected_email}` : ""}`
              : "Ainda não conectou via OAuth."}
          </p>
        </div>
        <div className="flex gap-2">
          {oauthStatus?.connected ? (
            <Button type="button" variant="outline" onClick={disconnect} disabled={saving}>
              Desconectar
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void connect()}
              disabled={saving || connecting}
              className="gap-2"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Conectar conta Google
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="g-client-id">OAuth Client ID</Label>
        <Input
          id="g-client-id"
          value={form.client_id}
          onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
          placeholder="xxxxx.apps.googleusercontent.com"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="g-client-secret">OAuth Client secret</Label>
        <PasswordRevealInput
          id="g-client-secret"
          value={form.client_secret}
          onChange={(e) => setForm((f) => ({ ...f, client_secret: e.target.value }))}
          placeholder={clientSecretSet ? "•••• deixe vazio para manter" : "G-O… ou similar"}
          autoComplete="new-password"
        />
        {clientSecretSet ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">Já existe um secret guardado.</p>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={clearSecret} disabled={saving}>
              Remover secret
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="g-folder">ID da pasta no Google Drive (exportações)</Label>
        <Input
          id="g-folder"
          value={form.drive_export_folder_id}
          onChange={(e) => setForm((f) => ({ ...f, drive_export_folder_id: e.target.value }))}
          placeholder="ID da pasta (da URL do Drive)"
          autoComplete="off"
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Enviar backups automaticamente</p>
          <p className="text-xs text-muted-foreground">
            Quando ativado, o servidor pode enviar o ZIP para o Drive ao gerar um backup.
          </p>
        </div>
        <Switch
          checked={form.auto_upload_backups === true}
          onCheckedChange={(v) => setForm((f) => ({ ...f, auto_upload_backups: v }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="g-notes">Notas internas</Label>
        <textarea
          id="g-notes"
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Ex.: conta de serviço, ambiente de testes, limites da API…"
        />
      </div>

      <Button type="button" onClick={save} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar
      </Button>
    </motion.div>
  );
}

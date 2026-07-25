import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Cloud,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchJson } from "@/lib/serverAuth";

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

async function fetchGoogleConfig() {
  return fetchJson("/admin/google-login/config", { method: "GET" });
}

export default function AdminGooglePanel() {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [publicBaseUrl, setPublicBaseUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [clearClientSecret, setClearClientSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    data,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-google-login-config"],
    queryFn: fetchGoogleConfig,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled !== false);
    setPublicBaseUrl(String(data.public_base_url || ""));
    setClientId(String(data.client_id || ""));
    setClientSecret("");
    setClearClientSecret(false);
  }, [data]);

  const redirectUri = useMemo(() => {
    const base = normalizeBaseUrl(publicBaseUrl);
    return base ? `${base}/api/auth/google-login/callback` : "";
  }, [publicBaseUrl]);

  const hasSecret = clearClientSecret
    ? false
    : Boolean(clientSecret.trim() || data?.has_client_secret);
  const configuredPreview = Boolean(
    enabled &&
      normalizeBaseUrl(publicBaseUrl) &&
      clientId.trim() &&
      hasSecret,
  );

  const copyRedirectUri = async () => {
    if (!redirectUri) return;
    try {
      await navigator.clipboard.writeText(redirectUri);
      toast.success("URI de redirecionamento copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        enabled,
        public_base_url: normalizeBaseUrl(publicBaseUrl),
        client_id: clientId.trim(),
        clear_client_secret: clearClientSecret,
      };
      if (clientSecret.trim()) {
        body.client_secret = clientSecret.trim();
      }
      const next = await fetchJson("/admin/google-login/config", {
        method: "PUT",
        body,
      });
      qc.setQueryData(["admin-google-login-config"], next);
      await qc.invalidateQueries({ queryKey: ["admin-google-login-config"] });
      setClientSecret("");
      setClearClientSecret(false);
      toast.success("Configuração do login Google salva.");
    } catch (e) {
      const code = String(e?.message || "");
      const messages = {
        invalid_public_base_url: "URL pública inválida.",
        invalid_allowed_email: "A allowlist contém um e-mail inválido.",
        invalid_request: "Dados inválidos.",
      };
      toast.error(messages[code] || e?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <KeyRound className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Login com Google
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure o OAuth do Google. Os e-mails autorizados gerem-se em
                Utilizadores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={configuredPreview ? "default" : "secondary"}>
              {configuredPreview ? "Pronto" : "Incompleto"}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching || saving}
              title="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            {error.message || "Erro ao carregar configuração."}
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <Label className="text-sm font-medium">Ativar login Google</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  O botão só aparece quando a integração está ativa e completa.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="google-public-base">URL pública do site</Label>
                <Input
                  id="google-public-base"
                  value={publicBaseUrl}
                  onChange={(e) => setPublicBaseUrl(e.target.value)}
                  placeholder="https://seu-dominio.com"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="google-client-id">Google Client ID</Label>
                <Input
                  id="google-client-id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="....apps.googleusercontent.com"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-client-secret">Google Client Secret</Label>
              <Input
                id="google-client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => {
                  setClientSecret(e.target.value);
                  if (e.target.value.trim()) setClearClientSecret(false);
                }}
                placeholder={
                  data?.has_client_secret
                    ? "Segredo já guardado. Preencha só para substituir."
                    : "Cole o client secret do Google Cloud"
                }
                autoComplete="new-password"
              />
              {data?.has_client_secret ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={clearClientSecret}
                    onChange={(e) => {
                      setClearClientSecret(e.target.checked);
                      if (e.target.checked) setClientSecret("");
                    }}
                    className="rounded border-input"
                  />
                  Remover segredo guardado ao salvar
                </label>
              ) : null}
            </div>

            <p className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
              Os Gmail autorizados a iniciar sessão são adicionados em{" "}
              <span className="font-medium text-foreground">
                Admin → Utilizadores
              </span>{" "}
              (secção «Nova conta Google»).
            </p>

            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Cloud className="h-4 w-4 text-accent" />
                Dados para o Google Cloud Console
              </div>
              <p className="text-xs text-muted-foreground">
                Cole estes valores em{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:text-accent"
                >
                  Credenciais OAuth 2.0
                </a>
                .
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Origem JavaScript autorizada</p>
                <code className="block break-all rounded border border-border bg-background px-3 py-2 text-xs">
                  {normalizeBaseUrl(publicBaseUrl) || "Defina a URL pública acima"}
                </code>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">URI de redirecionamento autorizada</p>
                <div className="flex gap-2">
                  <code className="block flex-1 break-all rounded border border-border bg-background px-3 py-2 text-xs">
                    {redirectUri || "Defina a URL pública acima"}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyRedirectUri}
                    disabled={!redirectUri}
                    title="Copiar URI"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Client secret: {hasSecret ? "configurado" : "em falta"}
                  {(data?.allowed_emails?.length ?? 0) > 0
                    ? ` · ${data.allowed_emails.length} e-mail(s) autorizados (geridos em Utilizadores).`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

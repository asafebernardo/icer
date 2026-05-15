import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Cloud,
  Copy,
  HardDriveDownload,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { fetchJson } from "@/lib/serverAuth";

const CALENDAR_SYNC_OPTIONS = [
  {
    value: "push",
    label: "Enviar para o Google",
    description: "Apenas envia os eventos do site para a agenda Google.",
  },
  {
    value: "pull",
    label: "Receber do Google",
    description: "Apenas lê eventos da agenda Google e mostra no site.",
  },
  {
    value: "two_way",
    label: "Dois sentidos",
    description: "Sincroniza eventos em ambas as direções (avançado).",
  },
];

function splitAllowedEmails(value) {
  return [...new Set(String(value || "")
    .split(/[\s,;]+/)
    .map((email) => email.toLowerCase().trim())
    .filter(Boolean))];
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

const BACKUP_DAYS = [
  { id: "sun", label: "Dom" },
  { id: "mon", label: "Seg" },
  { id: "tue", label: "Ter" },
  { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" },
  { id: "fri", label: "Sex" },
  { id: "sat", label: "Sáb" },
];

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
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [allowedEmailDraft, setAllowedEmailDraft] = useState("");
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupFolderId, setBackupFolderId] = useState("");
  const [backupAccountEmail, setBackupAccountEmail] = useState("");
  const [backupScheduleEnabled, setBackupScheduleEnabled] = useState(false);
  const [backupTime, setBackupTime] = useState("02:00");
  const [backupDays, setBackupDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [backupTimezone, setBackupTimezone] = useState("America/Sao_Paulo");
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [calendarId, setCalendarId] = useState("primary");
  const [calendarAccountEmail, setCalendarAccountEmail] = useState("");
  const [calendarSyncDirection, setCalendarSyncDirection] = useState("push");
  const [calendarAutoSyncOnSave, setCalendarAutoSyncOnSave] = useState(true);
  const [calendarDefaultTimezone, setCalendarDefaultTimezone] =
    useState("America/Sao_Paulo");
  const [saving, setSaving] = useState(false);
  /** Sub-aba ativa: "login" | "cloud" | "backup" | "calendar". */
  const [activeTab, setActiveTab] = useState("login");

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
    const emails = Array.isArray(data.allowed_emails)
      ? data.allowed_emails
      : splitAllowedEmails(data.allowed_emails_text);
    setAllowedEmails(splitAllowedEmails(emails.join(",")));
    setAllowedEmailDraft("");
    setBackupEnabled(data.backup?.enabled === true);
    setBackupFolderId(String(data.backup?.drive_folder_id || ""));
    setBackupAccountEmail(String(data.backup?.account_email || ""));
    setBackupScheduleEnabled(data.backup?.schedule_enabled === true);
    setBackupTime(String(data.backup?.time || "02:00"));
    setBackupDays(
      Array.isArray(data.backup?.days) && data.backup.days.length > 0
        ? data.backup.days
        : ["mon", "tue", "wed", "thu", "fri"],
    );
    setBackupTimezone(String(data.backup?.timezone || "America/Sao_Paulo"));
    setCalendarEnabled(data.calendar?.enabled === true);
    setCalendarId(String(data.calendar?.calendar_id || "primary"));
    setCalendarAccountEmail(String(data.calendar?.account_email || ""));
    setCalendarSyncDirection(
      ["push", "pull", "two_way"].includes(data.calendar?.sync_direction)
        ? data.calendar.sync_direction
        : "push",
    );
    setCalendarAutoSyncOnSave(data.calendar?.auto_sync_on_save !== false);
    setCalendarDefaultTimezone(
      String(data.calendar?.default_timezone || "America/Sao_Paulo"),
    );
  }, [data]);

  const redirectUri = useMemo(() => {
    const base = normalizeBaseUrl(publicBaseUrl);
    return base ? `${base}/api/auth/google-login/callback` : "";
  }, [publicBaseUrl]);

  const allowedCount = allowedEmails.length;
  const hasSecret = clearClientSecret ? false : Boolean(clientSecret.trim() || data?.has_client_secret);
  const configuredPreview = Boolean(
    enabled &&
      normalizeBaseUrl(publicBaseUrl) &&
      clientId.trim() &&
      hasSecret &&
      allowedCount > 0,
  );

  const addAllowedEmails = (rawValue) => {
    const parts = splitAllowedEmails(rawValue);
    if (parts.length === 0) return;
    const invalid = parts.filter((email) => !isValidEmail(email));
    if (invalid.length > 0) {
      toast.error(`E-mail inválido: ${invalid[0]}`);
      return;
    }
    setAllowedEmails((current) => {
      const seen = new Set(current);
      const next = [...current];
      let duplicates = 0;
      for (const email of parts) {
        if (seen.has(email)) {
          duplicates += 1;
          continue;
        }
        seen.add(email);
        next.push(email);
      }
      if (duplicates > 0) {
        toast.info("E-mail duplicado ignorado.");
      }
      return next;
    });
    setAllowedEmailDraft("");
  };

  const removeAllowedEmail = (email) => {
    setAllowedEmails((current) => current.filter((item) => item !== email));
  };

  const toggleBackupDay = (day) => {
    setBackupDays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }
      return BACKUP_DAYS.filter((item) => item.id === day || current.includes(item.id)).map(
        (item) => item.id,
      );
    });
  };

  const handleAllowedEmailInput = (value) => {
    if (/[,;\s]/.test(value)) {
      addAllowedEmails(value);
      return;
    }
    setAllowedEmailDraft(value.toLowerCase());
  };

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
    if (backupEnabled && backupScheduleEnabled && backupDays.length === 0) {
      toast.error("Selecione pelo menos um dia para executar o backup.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        enabled,
        public_base_url: normalizeBaseUrl(publicBaseUrl),
        client_id: clientId.trim(),
        allowed_emails: allowedEmails,
        clear_client_secret: clearClientSecret,
        backup: {
          enabled: backupEnabled,
          drive_folder_id: backupFolderId.trim(),
          account_email: backupAccountEmail.toLowerCase().trim(),
          schedule_enabled: backupScheduleEnabled,
          time: backupTime,
          days: backupDays,
          timezone: backupTimezone.trim() || "America/Sao_Paulo",
        },
        calendar: {
          enabled: calendarEnabled,
          calendar_id: calendarId.trim() || "primary",
          account_email: calendarAccountEmail.toLowerCase().trim(),
          sync_direction: calendarSyncDirection,
          auto_sync_on_save: calendarAutoSyncOnSave,
          default_timezone:
            calendarDefaultTimezone.trim() || "America/Sao_Paulo",
        },
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
      toast.success("Configuração do Google salva.");
    } catch (e) {
      const code = String(e?.message || "");
      const messages = {
        invalid_public_base_url: "URL pública inválida.",
        invalid_allowed_email: "A allowlist contém um e-mail inválido.",
        invalid_backup_schedule: "Selecione pelo menos um dia de backup.",
        invalid_calendar: "Configuração da agenda inválida.",
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
        className="bg-card border border-border rounded-2xl p-6 space-y-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Login com Google
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure o OAuth e autorize os Gmail que poderão iniciar sessão.
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
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
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
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:inline-flex sm:w-auto h-auto p-1 gap-1">
                <TabsTrigger
                  value="login"
                  className="gap-2 px-3 py-1.5"
                  aria-label="Login com Google"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Login</span>
                </TabsTrigger>
                <TabsTrigger
                  value="cloud"
                  className="gap-2 px-3 py-1.5"
                  aria-label="Configuração do Google Cloud"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Google Cloud</span>
                </TabsTrigger>
                <TabsTrigger
                  value="backup"
                  className="gap-2 px-3 py-1.5"
                  aria-label="Backup automático"
                >
                  <HardDriveDownload className="w-4 h-4" />
                  <span>Backup</span>
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="gap-2 px-3 py-1.5"
                  aria-label="Agenda Google"
                >
                  <CalendarRange className="w-4 h-4" />
                  <span>Agenda</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6 space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="google-allowed-emails">E-mails autorizados</Label>
              <div className="rounded-md border border-input bg-background px-3 py-2">
                <div className="flex min-h-10 flex-wrap items-center gap-2">
                  {allowedEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeAllowedEmail(email)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                        aria-label={`Remover ${email}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="google-allowed-emails"
                    value={allowedEmailDraft}
                    onChange={(e) => handleAllowedEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "," || e.key === ";") {
                        e.preventDefault();
                        addAllowedEmails(allowedEmailDraft);
                      } else if (
                        e.key === "Backspace" &&
                        !allowedEmailDraft &&
                        allowedEmails.length > 0
                      ) {
                        removeAllowedEmail(allowedEmails[allowedEmails.length - 1]);
                      }
                    }}
                    onBlur={() => addAllowedEmails(allowedEmailDraft)}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (/[,;\s]/.test(text)) {
                        e.preventDefault();
                        addAllowedEmails(text);
                      }
                    }}
                    placeholder={allowedEmails.length === 0 ? "email@gmail.com, outro@gmail.com" : ""}
                    className="min-w-[13rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                    autoComplete="off"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Digite ou cole e-mails separados por vírgula. Não é permitido cadastrar o mesmo e-mail duas vezes.
              </p>
              <p className="text-xs text-muted-foreground">
                Para migrar um membro existente, altere o e-mail da conta em Membros para o Gmail que ele usa no Google e depois adicione esse mesmo Gmail aqui.
              </p>
            </div>
              </TabsContent>

              <TabsContent value="cloud" className="mt-6 space-y-6">
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-accent" />
                    Configuração no Google Cloud Console
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Copie os valores abaixo e cole no ecrã{" "}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 text-foreground hover:text-accent"
                    >
                      Credenciais OAuth 2.0
                    </a>{" "}
                    do projeto.
                  </p>
                </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4" />
                Dados para o Google Cloud
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Origem JavaScript autorizada</p>
                <code className="block rounded bg-background border border-border px-3 py-2 text-xs break-all">
                  {normalizeBaseUrl(publicBaseUrl) || "Defina a URL pública acima"}
                </code>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">URI de redirecionamento autorizada</p>
                <div className="flex gap-2">
                  <code className="block flex-1 rounded bg-background border border-border px-3 py-2 text-xs break-all">
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
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
              </TabsContent>

              <TabsContent value="backup" className="mt-6 space-y-6">
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">Backup Google</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Defina a pasta no Google Drive e os dias/horário de execução do backup.
                  </p>
                </div>
                <Switch checked={backupEnabled} onCheckedChange={setBackupEnabled} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="google-backup-account">Conta Google do backup</Label>
                  <Input
                    id="google-backup-account"
                    type="email"
                    value={backupAccountEmail}
                    onChange={(e) => setBackupAccountEmail(e.target.value)}
                    placeholder="backup@gmail.com"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google-backup-folder">ID da pasta no Drive</Label>
                  <Input
                    id="google-backup-folder"
                    value={backupFolderId}
                    onChange={(e) => setBackupFolderId(e.target.value)}
                    placeholder="1AbCdEfGh..."
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="space-y-4 rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-2">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-accent" />
                    <div>
                      <Label className="text-sm font-medium">
                        Execução automática
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Escolha os dias da semana e o horário em que o backup deve rodar.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={backupScheduleEnabled}
                    onCheckedChange={setBackupScheduleEnabled}
                    disabled={!backupEnabled}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="google-backup-time">Horário do backup</Label>
                    <Input
                      id="google-backup-time"
                      type="time"
                      value={backupTime}
                      onChange={(e) => setBackupTime(e.target.value)}
                      disabled={!backupEnabled || !backupScheduleEnabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google-backup-timezone">Fuso horário</Label>
                    <Input
                      id="google-backup-timezone"
                      value={backupTimezone}
                      onChange={(e) => setBackupTimezone(e.target.value)}
                      placeholder="America/Sao_Paulo"
                      disabled={!backupEnabled || !backupScheduleEnabled}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dias de execução</Label>
                  <div className="flex flex-wrap gap-2">
                    {BACKUP_DAYS.map((day) => {
                      const selected = backupDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleBackupDay(day.id)}
                          disabled={!backupEnabled || !backupScheduleEnabled}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            selected
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Esta seção salva a configuração de agendamento. A rotina que envia o arquivo para o Google Drive deve usar estes dados para executar o backup.
              </p>
            </div>
              </TabsContent>

              <TabsContent value="calendar" className="mt-6 space-y-6">
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-accent" />
                    Integração com a Agenda Google
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Liga os eventos do site a uma agenda do Google. A rotina de
                    sincronização (cron / job) deve usar estes dados para criar,
                    atualizar e remover eventos na agenda escolhida.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Ativar integração com a Agenda Google
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Quando desligado, os eventos do site não são sincronizados
                      com o Google.
                    </p>
                  </div>
                  <Switch
                    checked={calendarEnabled}
                    onCheckedChange={setCalendarEnabled}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="google-calendar-account">
                      Conta Google da agenda
                    </Label>
                    <Input
                      id="google-calendar-account"
                      type="email"
                      value={calendarAccountEmail}
                      onChange={(e) =>
                        setCalendarAccountEmail(e.target.value)
                      }
                      placeholder="agenda@gmail.com"
                      disabled={!calendarEnabled}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      Conta dona da agenda. Costuma ser a mesma usada para o
                      backup.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google-calendar-id">ID da agenda</Label>
                    <Input
                      id="google-calendar-id"
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      placeholder="primary ou xxx@group.calendar.google.com"
                      disabled={!calendarEnabled}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                        primary
                      </code>{" "}
                      para a agenda principal da conta, ou cole o ID de uma
                      agenda secundária.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google-calendar-direction">
                    Direção da sincronização
                  </Label>
                  <Select
                    value={calendarSyncDirection}
                    onValueChange={(v) => setCalendarSyncDirection(v)}
                    disabled={!calendarEnabled}
                  >
                    <SelectTrigger id="google-calendar-direction">
                      <SelectValue placeholder="Escolha a direção" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALENDAR_SYNC_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {
                      CALENDAR_SYNC_OPTIONS.find(
                        (o) => o.value === calendarSyncDirection,
                      )?.description
                    }
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex items-start gap-2">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-accent" />
                    <div>
                      <Label className="text-sm font-medium">
                        Sincronizar ao guardar evento
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Envia automaticamente o evento para a agenda Google
                        sempre que for criado ou editado no site.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={calendarAutoSyncOnSave}
                    onCheckedChange={setCalendarAutoSyncOnSave}
                    disabled={!calendarEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google-calendar-timezone">
                    Fuso horário dos eventos
                  </Label>
                  <Input
                    id="google-calendar-timezone"
                    value={calendarDefaultTimezone}
                    onChange={(e) =>
                      setCalendarDefaultTimezone(e.target.value)
                    }
                    placeholder="America/Sao_Paulo"
                    disabled={!calendarEnabled}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado quando o evento não tem um fuso explícito.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Esta seção salva a configuração da integração. A rotina que
                  comunica com a API do Google Agenda deve usar estes dados
                  para sincronizar os eventos do site.
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {allowedCount} e-mail(s) na allowlist. Client secret:{" "}
                {hasSecret ? "configurado" : "em falta"}.
              </p>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
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

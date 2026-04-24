import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordRevealInput from "@/components/shared/PasswordRevealInput";
import {
  validateAccountPassword,
  accountPasswordPolicyHint,
  passwordPolicyErrorMessagePt,
} from "@/lib/passwordPolicy";
import { useAuth } from "@/lib/AuthContext";
import { isDemoAdminSession, isServerAuthEnabled } from "@/lib/auth";
import UserAvatar from "@/components/shared/UserAvatar";
import {
  IMAGE_UPLOAD_RECOMMENDATION,
  uploadImageFile,
} from "@/lib/uploadImage";

export default function ProfileSettings({ user: userProp }) {
  const { updateProfile } = useAuth();
  const user = userProp;
  const demo = isDemoAdminSession(user);
  const canAvatar =
    !demo && isServerAuthEnabled() && user?._authSource === "server";

  const fileRef = useRef(null);
  const [fullName, setFullName] = useState(
    () => user?.full_name || user?.email?.split("@")[0] || "",
  );
  const [email, setEmail] = useState(() => user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(() =>
    String(user?.avatar_url || "").trim(),
  );
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const requiresCurrentPassword = !demo && (!!newPassword || email !== (user?.email || ""));

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || user.email?.split("@")[0] || "");
    setEmail(user.email || "");
    setAvatarUrl(String(user.avatar_url || "").trim());
  }, [user?.email, user?.full_name, user?.avatar_url]);

  const handleAvatarPick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !canAvatar) return;
    setError(null);
    setAvatarBusy(true);
    try {
      const { file_url } = await uploadImageFile(f);
      if (file_url) setAvatarUrl(file_url);
    } catch (err) {
      setError(err?.message || "Não foi possível enviar a imagem.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("A confirmação da nova palavra-passe não coincide.");
      return;
    }
    if (newPassword) {
      const pw = validateAccountPassword(newPassword);
      if (!pw.ok) {
        setError(passwordPolicyErrorMessagePt(pw.code));
        return;
      }
    }

    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        email,
        currentPassword,
        newPassword: newPassword || undefined,
        ...(canAvatar ? { avatar_url: avatarUrl } : {}),
      });
      setMessage("Alterações guardadas.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEmail((prev) => prev.trim().toLowerCase());
    } catch (err) {
      setError(err?.message || "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <UserAvatar user={user} className="h-10 w-10" />
        <div>
          <h2 className="font-semibold text-foreground text-lg">A minha conta</h2>
          <p className="text-sm text-muted-foreground">
            Nome, e-mail, foto de perfil e palavra-passe
          </p>
        </div>
      </div>

      {demo && (
        <p className="text-sm text-muted-foreground border border-border rounded-lg p-3 mb-4 bg-muted/30">
          Conta de demonstração: só pode alterar o nome abaixo. E-mail e
          palavra-passe vêm das variáveis{" "}
          <code className="text-xs bg-muted px-1 rounded">VITE_DEMO_*</code> no
          ficheiro <code className="text-xs bg-muted px-1 rounded">.env</code>.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        {canAvatar ? (
          <div className="space-y-3 pb-4 border-b border-border">
            <Label>Foto de perfil</Label>
            <div className="flex flex-wrap items-center gap-4">
              <UserAvatar
                user={{ ...user, avatar_url: avatarUrl }}
                className="h-20 w-20"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={avatarBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  {avatarBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A enviar…
                    </>
                  ) : (
                    "Escolher imagem"
                  )}
                </Button>
                {avatarUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setAvatarUrl("")}
                  >
                    Remover foto
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{IMAGE_UPLOAD_RECOMMENDATION}</p>
            <p className="text-xs text-muted-foreground">
              Guarde com &quot;Salvar&quot; para aplicar a foto na sua conta.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="profile-name">Nome</Label>
          <Input
            id="profile-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">E-mail</Label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={demo}
            autoComplete="email"
          />
        </div>
        <p className="text-xs text-muted-foreground max-w-lg">
          {accountPasswordPolicyHint()}
        </p>
        <div className="space-y-2">
          <Label htmlFor="profile-current">Palavra-passe atual</Label>
          <PasswordRevealInput
            id="profile-current"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required={requiresCurrentPassword}
            placeholder={
              requiresCurrentPassword
                ? ""
                : "Só é necessária para trocar e-mail ou palavra-passe"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-new">Nova palavra-passe (opcional)</Label>
          <PasswordRevealInput
            id="profile-new"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={demo}
            autoComplete="new-password"
            placeholder="Deixe vazio para manter"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-confirm">Confirmar nova palavra-passe</Label>
          <PasswordRevealInput
            id="profile-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={demo}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-green-600 dark:text-green-500">{message}</p>
        )}

        <Button type="submit" variant="success" disabled={saving || avatarBusy}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A salvar…
            </>
          ) : (
            "Salvar"
          )}
        </Button>
      </form>
    </motion.div>
  );
}

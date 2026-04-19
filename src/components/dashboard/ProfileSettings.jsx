import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { isDemoAdminSession } from "@/lib/auth";

export default function ProfileSettings({ user: userProp }) {
  const { updateProfile } = useAuth();
  const user = userProp;
  const demo = isDemoAdminSession(user);

  const [fullName, setFullName] = useState(
    () => user?.full_name || user?.email?.split("@")[0] || "",
  );
  const [email, setEmail] = useState(() => user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || user.email?.split("@")[0] || "");
    setEmail(user.email || "");
  }, [user?.email, user?.full_name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("A confirmação da nova palavra-passe não coincide.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        email,
        currentPassword,
        newPassword: newPassword || undefined,
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
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-lg">A minha conta</h2>
          <p className="text-sm text-muted-foreground">
            Nome, e-mail e palavra-passe (armazenada com hash seguro neste
            navegador)
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
        <div className="space-y-2">
          <Label htmlFor="profile-current">Palavra-passe atual</Label>
          <Input
            id="profile-current"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-new">Nova palavra-passe (opcional)</Label>
          <Input
            id="profile-new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={demo}
            autoComplete="new-password"
            placeholder="Deixe vazio para manter"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-confirm">Confirmar nova palavra-passe</Label>
          <Input
            id="profile-confirm"
            type="password"
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

        <Button type="submit" variant="success" disabled={saving}>
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

import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import PasswordRevealInput from "@/components/shared/PasswordRevealInput";
import { fetchJson } from "@/lib/serverAuth";
import {
  validateAccountPassword,
  accountPasswordPolicyHint,
  passwordPolicyErrorMessagePt,
  isAccountPasswordPolicyCode,
} from "@/lib/passwordPolicy";

function useQueryParam(name) {
  const location = useLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const v = sp.get(name);
    return v && v.trim() ? v.trim() : "";
  }, [location.search, name]);
}

export default function AcceptInvite() {
  const token = useQueryParam("token");
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          token: z.string().min(10),
          full_name: z.string().optional(),
          password: z.string().min(1),
          password2: z.string().min(1),
        })
        .refine((v) => v.password === v.password2, {
          message: "As palavras-passe não coincidem.",
          path: ["password2"],
        }),
    [],
  );

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse({
      token,
      full_name: fullName.trim() || undefined,
      password,
      password2,
    });
    if (!parsed.success) {
      setError(parsed.error.issues?.[0]?.message || "Dados inválidos.");
      return;
    }
    const policy = validateAccountPassword(parsed.data.password);
    if (!policy.ok) {
      setError(passwordPolicyErrorMessagePt(policy.code));
      return;
    }
    setIsSubmitting(true);
    try {
      await fetchJson("/auth/accept-invite", {
        method: "POST",
        body: {
          token: parsed.data.token,
          password: parsed.data.password,
          full_name: parsed.data.full_name,
        },
      });
      setDone(true);
      setTimeout(() => navigate("/Home"), 800);
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg === "invalid_or_expired_invite") {
        setError("Convite inválido ou expirado.");
      } else if (msg === "password_already_set") {
        setError("Este convite já foi usado.");
      } else if (isAccountPasswordPolicyCode(msg)) {
        setError(passwordPolicyErrorMessagePt(msg));
      } else {
        setError(msg || "Não foi possível cadastrar a palavra-passe.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        pageKey="login"
        tag="Convite"
        title="Criar palavra-passe"
        description="Defina uma palavra-passe para ativar a sua conta."
      />
      <section className="py-12 lg:py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            {!token ? (
              <p className="text-sm text-destructive">
                Link inválido: token em falta.
              </p>
            ) : done ? (
              <p className="text-sm text-green-600">
                Palavra-passe cadastrada. Você já pode fazer login.
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome (opcional)</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {accountPasswordPolicyHint()}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="invite-pw">Nova palavra-passe</Label>
                  <PasswordRevealInput
                    id="invite-pw"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Defina a palavra-passe"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-pw2">Confirmar palavra-passe</Label>
                  <PasswordRevealInput
                    id="invite-pw2"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    placeholder="Repita a palavra-passe"
                    autoComplete="new-password"
                  />
                </div>
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Salvando..." : "Criar palavra-passe"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}


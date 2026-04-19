import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();

    const ok = await login(email, senha);

    if (!ok) {
      alert("Login inválido");
      return;
    }

    navigate("/Dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        pageKey="login"
        tag="ICER"
        title="Login"
        description="Aceda com o seu e-mail e palavra-passe."
      />

      <div className="max-w-md mx-auto px-4 -mt-10 sm:-mt-14 relative z-10 pb-16">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-6 sm:p-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-senha">Senha</Label>
              <Input
                id="login-senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full mt-2">
              Entrar
            </Button>
            {import.meta.env.DEV &&
              import.meta.env.VITE_ENABLE_DEMO_LOGIN !== "true" && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Login local desativado. Copie{" "}
                  <code className="text-[10px] bg-muted px-1 rounded">
                    env.example
                  </code>{" "}
                  para{" "}
                  <code className="text-[10px] bg-muted px-1 rounded">
                    .env.local
                  </code>{" "}
                  e defina{" "}
                  <code className="text-[10px] bg-muted px-1 rounded">
                    VITE_ENABLE_DEMO_LOGIN
                  </code>{" "}
                  e credenciais de demo.
                </p>
              )}
          </form>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Lock, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLoginBlockedAdminNavItems } from "@/lib/adminNavConfig";
import { setLoginIntent } from "@/lib/loginIntent";

/**
 * Em homologação, lista abas do admin bloqueadas por falta de sessão no servidor.
 */
export default function HomologBlockedMenusNotice({
  blockedItems,
  showLoginLink = true,
}) {
  const items = blockedItems ?? getLoginBlockedAdminNavItems();
  if (!items.length) return null;

  return (
    <div
      className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 sm:p-5 text-sm"
      role="status"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-950 dark:text-amber-50">
          <Lock className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-medium text-foreground">
              Homologação — abas bloqueadas por login no servidor
            </p>
            <p className="mt-1 text-muted-foreground">
              Pode abrir qualquer aba abaixo para pré-visualizar, mas o conteúdo
              só funciona com sessão real no MongoDB (login Google).
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <Badge
                  variant="secondary"
                  className="border border-amber-500/25 bg-background/80 font-normal"
                >
                  {item.label}
                </Badge>
              </li>
            ))}
          </ul>
          {showLoginLink ? (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link
                to="/login"
                onClick={() => setLoginIntent()}
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Ir para login
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

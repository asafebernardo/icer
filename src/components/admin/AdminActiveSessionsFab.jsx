import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/auth";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import { toast } from "sonner";
import { withCsrfHeaderAsync } from "@/lib/csrf";

export default function AdminActiveSessionsFab() {
  const { user } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kickingUser, setKickingUser] = useState({});

  const onDashboard =
    location.pathname === "/Dashboard" || location.pathname.endsWith("/Dashboard");
  const showFab =
    isServerAuthEnabled() &&
    user?._authSource === "server" &&
    isAdminUser(user) &&
    !onDashboard;

  const {
    data: activeSessions = [],
    isLoading: loadingSessions,
    refetch,
  } = useQuery({
    queryKey: ["admin-active-sessions"],
    queryFn: async () => {
      const r = await fetch("/api/admin/sessions/active", { credentials: "include" });
      if (!r.ok) throw new Error("sessões");
      return r.json();
    },
    enabled: showFab,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!showFab) return;
    const onSession = () => {
      void qc.invalidateQueries({ queryKey: ["admin-active-sessions"] });
    };
    window.addEventListener("icer-user-session", onSession);
    return () => window.removeEventListener("icer-user-session", onSession);
  }, [showFab, qc]);

  const kickUser = async (userId) => {
    setKickingUser((m) => ({ ...m, [userId]: true }));
    try {
      const headers = await withCsrfHeaderAsync();
      const r = await fetch(`/api/admin/sessions/active/${userId}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) throw new Error(parsed?.message || "Não foi possível derrubar.");
      toast.success("Sessão derrubada.");
      void refetch();
    } catch (e) {
      toast.error(e?.message || "Erro ao derrubar sessão.");
    } finally {
      setKickingUser((m) => ({ ...m, [userId]: false }));
    }
  };

  if (!showFab) return null;

  const count = Array.isArray(activeSessions) ? activeSessions.length : 0;

  return (
    <div className="fixed bottom-4 right-4 z-[40] flex flex-col items-end gap-2 max-w-[min(100vw-2rem,22rem)]">
      {open ? (
        <div
          className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg overflow-hidden w-full"
          role="dialog"
          aria-label="Sessões ativas"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Sessões ativas</p>
              <p className="text-[11px] text-muted-foreground">{count} sessão(ões)</p>
            </div>
            <div className="flex items-center shrink-0 gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Atualizar"
                onClick={() => void refetch()}
                disabled={loadingSessions}
              >
                <RefreshCw className={`w-4 h-4 ${loadingSessions ? "animate-spin" : ""}`} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-[min(50vh,320px)] overflow-y-auto p-2">
            {loadingSessions ? (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">A carregar…</p>
            ) : count === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                Nenhuma sessão ativa.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {activeSessions.map((s) => (
                  <li
                    key={s.token_hash}
                    className="rounded-xl border border-border/80 bg-muted/30 px-2.5 py-2 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 text-xs">
                      <p className="font-medium text-foreground truncate">
                        {s.user_full_name || "—"}
                      </p>
                      <p className="text-muted-foreground truncate">{s.user_email || `id ${s.user_id}`}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        expira {String(s.expires_at).replace("T", " ").replace("Z", "")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] shrink-0 px-2"
                      disabled={kickingUser[s.user_id] === true || s.user_id === user?.id}
                      onClick={() => kickUser(s.user_id)}
                    >
                      {kickingUser[s.user_id] ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        "Derrubar"
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="h-12 w-12 rounded-full shadow-lg p-0 relative"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Utilizadores com sessão ativa"
      >
        <Users className="w-5 h-5" />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
        <span className="sr-only">Sessões ativas</span>
      </Button>
    </div>
  );
}

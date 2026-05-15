import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, RefreshCw } from "lucide-react";

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

function parseKey(key) {
  const raw = String(key || "");
  if (raw.startsWith("ip:")) return { kind: "IP", value: raw.slice(3) };
  if (raw.startsWith("user:")) return { kind: "Utilizador", value: raw.slice(5) };
  return { kind: "—", value: raw || "—" };
}

async function fetchLoginBlocks() {
  const r = await fetch("/api/admin/login-blocks", { credentials: "include" });
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

export default function LoginBlocksPanel() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-login-blocks"],
    queryFn: fetchLoginBlocks,
  });

  const rows = Array.isArray(data?.rows) ? data.rows : [];

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
              <ShieldAlert className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                Bloqueios de login
              </h2>
              <p className="text-sm text-muted-foreground">
                IPs e utilizadores temporariamente bloqueados por excesso de
                tentativas.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Atualizar"
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
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
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhum bloqueio ativo.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left font-medium p-3 w-32">Tipo</th>
                  <th className="text-left font-medium p-3">Valor</th>
                  <th className="text-center font-medium p-3 w-28">Tentativas</th>
                  <th className="text-left font-medium p-3 w-40">Bloqueado até</th>
                  <th className="text-left font-medium p-3 w-40">Última falha</th>
                  <th className="text-left font-medium p-3 w-28">Nível</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const info = parseKey(r.key);
                  const hard = r.hard === true;
                  return (
                    <tr
                      key={r.key}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="p-3 font-medium text-foreground">
                        {info.kind}
                      </td>
                      <td className="p-3 text-foreground">{info.value}</td>
                      <td className="p-3 text-center tabular-nums">
                        {typeof r.count === "number" ? r.count : "—"}
                      </td>
                      <td className="p-3">{formatTs(r.locked_until)}</td>
                      <td className="p-3">{formatTs(r.last_fail_at)}</td>
                      <td className="p-3">
                        {hard ? (
                          <Badge variant="destructive">9+</Badge>
                        ) : (
                          <Badge variant="secondary">3+</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && rows.length > 0 ? (
          <p className="text-xs text-muted-foreground mt-3">
            Dica: 3+ falhas bloqueia por alguns minutos; 9+ aplica bloqueio mais
            longo (“fora do ar” para aquele utilizador/IP).
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}


import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Music, Plus } from "lucide-react";

import { api } from "@/api/client";
import HinarioEditorDialog from "@/components/hinario/HinarioEditorDialog";
import HinarioFrame from "@/components/hinario/HinarioFrame";
import { useHinarioPerm } from "@/components/hinario/useHinarioPerm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export default function HinarioPage() {
  const perm = useHinarioPerm();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: musicas = [], isLoading, isError } = useQuery({
    queryKey: ["musicas-letras"],
    queryFn: async () => {
      const list = await api.entities.MusicaLetra.list("numero", 2000);
      return Array.isArray(list) ? list : [];
    },
  });

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    const rows = [...musicas].sort(
      (a, b) => Number(a.numero) - Number(b.numero) || Number(a.id) - Number(b.id),
    );
    if (!q) return rows;
    return rows.filter((m) => {
      const numero = String(m.numero ?? "");
      return numero.includes(query.trim()) || fold(m.titulo).includes(q);
    });
  }, [musicas, query]);

  return (
    <HinarioFrame>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:top-[8.25rem] sm:bg-card/95">
        <div className="flex items-center gap-2">
          <Link
            to="/Apps"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            aria-label="Voltar a Apps"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-tight text-foreground">Hinário</h1>
            <p className="text-xs text-muted-foreground">Letras das músicas</p>
          </div>
          {perm.create ? (
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Nova
            </Button>
          ) : null}
        </div>
        <Input
          className="mt-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Número ou título"
          aria-label="Pesquisar música"
          type="search"
        />
        {perm.needsEditMode ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Ative o modo edição para acrescentar ou alterar letras.
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Não foi possível carregar as músicas.
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Music className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <p className="text-base font-medium text-foreground">
            {musicas.length === 0 ? "Nenhuma música ainda" : "Nenhum resultado"}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {musicas.length === 0
              ? "O hinário começa vazio. As letras são acrescentadas no modo edição."
              : "Tente outro número ou parte do título."}
          </p>
        </div>
      ) : (
        <ul>
          {filtered.map((m) => (
            <li key={m.id} className="border-b border-border/70 last:border-b-0">
              <Link
                to={`/Apps/musicas/${m.id}`}
                className="flex min-h-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/5"
              >
                <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {m.numero}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">
                  {m.titulo}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <HinarioEditorDialog open={creating} onOpenChange={setCreating} />
    </HinarioFrame>
  );
}

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/api/client";
import HinarioEditorDialog from "@/components/hinario/HinarioEditorDialog";
import HinarioFrame from "@/components/hinario/HinarioFrame";
import { useHinarioPerm } from "@/components/hinario/useHinarioPerm";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHinarioFontSize } from "@/lib/hinarioFont";
import {
  SOFT_DELETE_CONFIRM_DESCRIPTION,
  SOFT_DELETE_TOAST_SCHEDULED,
} from "@/lib/softDeleteUi";

export default function HinarioMusicaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const perm = useHinarioPerm();
  const font = useHinarioFontSize();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const numericId = Number(id);
  const idOk = Number.isFinite(numericId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["musicas-letras", String(id)],
    enabled: idOk,
    queryFn: () => api.entities.MusicaLetra.get(numericId),
  });

  const remove = useMutation({
    mutationFn: () => api.entities.MusicaLetra.delete(numericId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["musicas-letras"] });
      toast.success(SOFT_DELETE_TOAST_SCHEDULED);
      navigate("/Apps/musicas", { replace: true });
    },
    onError: () => {
      toast.error("Não foi possível remover a música.");
    },
  });

  const missing = !idOk || (isError && error?.status === 404);

  return (
    <HinarioFrame>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-2 py-2 backdrop-blur sm:top-[8.25rem] sm:bg-card/95">
        <div className="flex items-center gap-1">
          <Link
            to="/Apps/musicas"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            aria-label="Voltar à lista"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1 px-1">
            {data ? (
              <>
                <p className="text-xs tabular-nums text-muted-foreground">{data.numero}</p>
                <h1 className="truncate text-base font-semibold leading-tight text-foreground">
                  {data.titulo}
                </h1>
              </>
            ) : (
              <p className="text-sm font-medium text-foreground">Hinário</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2.5 font-wiki"
            aria-label="Reduzir fonte"
            disabled={!font.canDecrease}
            onClick={font.decrease}
          >
            A−
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2.5 font-wiki"
            aria-label="Aumentar fonte"
            disabled={!font.canIncrease}
            onClick={font.increase}
          >
            A+
          </Button>
        </div>
        {data && (perm.edit || perm.delete) ? (
          <div className="mt-2 flex justify-end gap-2 px-1">
            {perm.edit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Editar
              </Button>
            ) : null}
            {perm.delete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Apagar
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {isLoading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : missing ? (
        <div className="px-6 py-16 text-center">
          <p className="text-base font-medium text-foreground">Música não encontrada</p>
          <Link
            to="/Apps/musicas"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Voltar à lista
          </Link>
        </div>
      ) : isError ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Não foi possível abrir esta música.
        </p>
      ) : (
        <article
          className="whitespace-pre-wrap px-5 py-6 font-wiki leading-relaxed text-foreground"
          style={{ fontSize: `${font.size}px` }}
        >
          {data.letra}
        </article>
      )}

      {data ? (
        <HinarioEditorDialog
          open={editing}
          onOpenChange={setEditing}
          musica={data}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Apagar esta música?"
        description={SOFT_DELETE_CONFIRM_DESCRIPTION}
        confirmLabel="Apagar"
        onConfirm={() => remove.mutate()}
      />
    </HinarioFrame>
  );
}

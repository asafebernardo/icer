import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function messageForSaveError(err) {
  const code = String(err?.message || "");
  if (code === "numero_em_uso") return "Já existe uma música com esse número.";
  if (code === "numero_invalido") return "Indique um número entre 1 e 9999.";
  if (code === "titulo_invalido") return "Indique o título (até 200 caracteres).";
  if (code === "letra_invalida") return "Indique a letra da música.";
  return "Não foi possível guardar a música.";
}

/**
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, musica?: { id?: number, numero?: number, titulo?: string, letra?: string } | null }} props
 */
export default function HinarioEditorDialog({ open, onOpenChange, musica }) {
  const queryClient = useQueryClient();
  const editing = Boolean(musica?.id);
  const [numero, setNumero] = useState("");
  const [titulo, setTitulo] = useState("");
  const [letra, setLetra] = useState("");

  useEffect(() => {
    if (!open) return;
    setNumero(musica?.numero != null ? String(musica.numero) : "");
    setTitulo(musica?.titulo || "");
    setLetra(musica?.letra || "");
  }, [open, musica?.id, musica?.numero, musica?.titulo, musica?.letra]);

  const save = useMutation({
    mutationFn: (data) =>
      editing
        ? api.entities.MusicaLetra.update(musica.id, data)
        : api.entities.MusicaLetra.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["musicas-letras"] });
      toast.success(editing ? "Música atualizada." : "Música criada.");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(messageForSaveError(err));
    },
  });

  const submit = (event) => {
    event.preventDefault();
    const n = Number(String(numero).trim());
    save.mutate({
      numero: n,
      titulo: titulo.trim(),
      letra: letra.replace(/\r\n/g, "\n").trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar música" : "Nova música"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <label htmlFor="hinario-numero" className="text-xs font-medium text-muted-foreground">
              Número
            </label>
            <Input
              id="hinario-numero"
              inputMode="numeric"
              autoComplete="off"
              placeholder="12"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="hinario-titulo" className="text-xs font-medium text-muted-foreground">
              Título
            </label>
            <Input
              id="hinario-titulo"
              placeholder="Título da música"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="hinario-letra" className="text-xs font-medium text-muted-foreground">
              Letra
            </label>
            <Textarea
              id="hinario-letra"
              placeholder={"Primeira estrofe\n\nSegunda estrofe"}
              value={letra}
              onChange={(e) => setLetra(e.target.value)}
              rows={12}
              className="min-h-48 font-wiki leading-relaxed"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

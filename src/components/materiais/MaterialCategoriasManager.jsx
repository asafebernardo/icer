import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { toast } from "sonner";
import {
  SEM_CATEGORIA_ID,
  getMaterialCategoriasList,
  normalizeMaterialCategoriasDef,
  slugifyCategoryId,
} from "./materiaisConfig";
import { migrateMaterialsToSemCategoria } from "./migrateMaterialsCategoria";

function uniqueSlug(base, existingIds) {
  let id = base;
  let n = 0;
  while (existingIds.has(id)) {
    n += 1;
    id = `${base}-${n}`;
  }
  return id;
}

/**
 * Diálogo para criar, editar e remover categorias de materiais.
 */
export default function MaterialCategoriasManager({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(() =>
    getMaterialCategoriasList(getSiteConfig()),
  );
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (open) {
      setRows(getMaterialCategoriasList(getSiteConfig()));
      setNewLabel("");
      setEditingId(null);
      setDeleteTarget(null);
    }
  }, [open]);

  const persist = (next, { quiet = false } = {}) => {
    const normalized = normalizeMaterialCategoriasDef(next);
    setRows(normalized);
    try {
      setSiteConfig({ materialCategoriasDef: normalized });
      if (!quiet) toast.success("Categorias guardadas.");
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar.");
    }
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const existingIds = new Set(rows.map((r) => r.id));
    const base = slugifyCategoryId(label);
    const id = uniqueSlug(base, existingIds);
    persist([...rows, { id, label }]);
    setNewLabel("");
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditDraft(r.label);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const label = editDraft.trim();
    if (!label) return;
    persist(
      rows.map((r) =>
        r.id === editingId ? { ...r, label } : r,
      ),
    );
    setEditingId(null);
  };

  const requestDelete = (r) => {
    if (r.locked || r.id === SEM_CATEGORIA_ID) return;
    setDeleteTarget(r);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      const n = await migrateMaterialsToSemCategoria(id);
      const next = rows.filter((r) => r.id !== id);
      persist(next, { quiet: true });
      toast.success(
        n > 0
          ? `Categoria removida. ${n} material(is) passou(aram) a «Sem categoria».`
          : "Categoria removida.",
      );
    } catch (e) {
      toast.error(e?.message || "Não foi possível remover a categoria.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Categorias de materiais</DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              A categoria «Sem categoria» não pode ser removida. Ao apagar uma
              categoria, os materiais que a usavam passam automaticamente para
              «Sem categoria».
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Nova categoria
                </label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Nome (ex.: Escola Bíblica)"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <Button type="button" className="gap-2 shrink-0" onClick={handleAdd}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>

            <ul className="divide-y divide-border rounded-xl border border-border">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm"
                >
                  <code className="text-[11px] text-muted-foreground shrink-0 max-w-[7rem] truncate">
                    {r.id}
                  </code>
                  {editingId === r.id ? (
                    <Input
                      className="h-8 flex-1 min-w-0"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 font-medium text-foreground min-w-0 truncate">
                      {r.label}
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {editingId === r.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        onClick={saveEdit}
                      >
                        OK
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Editar nome"
                        onClick={() => startEdit(r)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {!r.locked && r.id !== SEM_CATEGORIA_ID ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Remover categoria"
                        onClick={() => requestDelete(r)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remover categoria?"
        description={
          deleteTarget
            ? `Os materiais em «${deleteTarget.label}» passarão a «Sem categoria».`
            : ""
        }
        confirmLabel="Remover"
        onConfirm={confirmDelete}
      />
    </>
  );
}

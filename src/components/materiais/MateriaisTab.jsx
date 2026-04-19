import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  File,
  FolderOpen,
  Palette,
  Plus,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { toast } from "sonner";
import {
  tipoIcons,
  materialCategorias,
  CATEGORIA_ICON_OPTIONS,
  getMergedCategoriaIconIds,
  categoriaIconComponent,
} from "./materiaisConfig";
import { MaterialForm } from "./MaterialForm";

function readCategoriaIcons() {
  return getMergedCategoriaIconIds(getSiteConfig());
}

export default function MateriaisTab({ perm }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [categoriaIconIds, setCategoriaIconIds] = useState(readCategoriaIcons);
  const [iconsDialogOpen, setIconsDialogOpen] = useState(false);
  const [iconsDraft, setIconsDraft] = useState(readCategoriaIcons);

  const syncIcons = useCallback(() => {
    setCategoriaIconIds(readCategoriaIcons());
  }, []);

  useEffect(() => {
    window.addEventListener("icer-site-config", syncIcons);
    return () => window.removeEventListener("icer-site-config", syncIcons);
  }, [syncIcons]);

  const openIconsDialog = () => {
    setIconsDraft(readCategoriaIcons());
    setIconsDialogOpen(true);
  };

  const saveCategoriaIcons = () => {
    try {
      setSiteConfig({ materialCategoriaIcons: iconsDraft });
      setCategoriaIconIds({ ...iconsDraft });
      setIconsDialogOpen(false);
      toast.success("Ícones das categorias guardados.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar.");
    }
  };

  const { data: materiais = [], isLoading } = useQuery({
    queryKey: ["materiais"],
    queryFn: async () => {
      try {
        const list = await api.entities.Material.list("-created_date", 50);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Material.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Material.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      setEditingMaterial(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Material.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materiais"] }),
  });

  const filtered =
    filter === "all"
      ? materiais
      : materiais.filter((m) => m.categoria === filter);

  return (
    <div>
      {(perm.create || perm.edit) && (
        <div className="flex flex-wrap justify-end gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={openIconsDialog}
            title="Escolher ícone por categoria (filtros e etiquetas)"
          >
            <Palette className="w-4 h-4" />
            Ícones por categoria
          </Button>
          {perm.create ? (
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
              onClick={() => {
                setShowForm(true);
                setEditingMaterial(null);
              }}
            >
              <Plus className="w-4 h-4" /> Novo Material
            </Button>
          ) : null}
        </div>
      )}
      {(perm.edit || perm.create) && (
        <Dialog open={iconsDialogOpen} onOpenChange={setIconsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ícone por categoria</DialogTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Cada categoria pode ter um ícone. As escolhas ficam guardadas
                neste navegador e aparecem nos filtros e nas etiquetas dos
                cartões.
              </p>
            </DialogHeader>
            <div className="space-y-6 py-2">
              {Object.entries(materialCategorias).map(([catKey, catLabel]) => {
                const selected = iconsDraft[catKey];
                return (
                  <div key={catKey} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {catLabel}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIA_ICON_OPTIONS.map(({ id, Icon, label }) => {
                        const isOn = selected === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            title={label}
                            onClick={() =>
                              setIconsDraft((d) => ({ ...d, [catKey]: id }))
                            }
                            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                              isOn
                                ? "border-accent bg-accent/15 text-accent"
                                : "border-border bg-muted/40 text-muted-foreground hover:border-accent/50 hover:bg-muted"
                            }`}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIconsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={saveCategoriaIcons}
              >
                Salvar ícones
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {(perm.create || perm.edit) && (
        <Dialog
          open={Boolean(showForm || editingMaterial)}
          onOpenChange={(o) => {
            if (!o) {
              setShowForm(false);
              setEditingMaterial(null);
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? "Editar material" : "Novo material"}
              </DialogTitle>
            </DialogHeader>
            {(showForm || editingMaterial) && (
              <MaterialForm
                inDialog
                key={editingMaterial?.id ?? "new-material"}
                material={editingMaterial || undefined}
                onSave={(d) => {
                  if (editingMaterial) {
                    updateMutation.mutate({
                      id: editingMaterial.id,
                      data: d,
                    });
                  } else {
                    createMutation.mutate(d);
                  }
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingMaterial(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className="rounded-full"
        >
          Todos
        </Button>
        {Object.entries(materialCategorias).map(([key, label]) => {
          const CatIcon = categoriaIconComponent(categoriaIconIds[key]);
          return (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key)}
              className="rounded-full gap-1.5"
            >
              <CatIcon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="rounded-2xl border border-border p-5">
                <Skeleton className="h-10 w-10 rounded-xl mb-4" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum material encontrado"
          description="Em breve novos materiais serão disponibilizados."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((material, index) => {
            const Icon = tipoIcons[material.tipo] || File;
            const CatIcon = material.categoria
              ? categoriaIconComponent(categoriaIconIds[material.categoria])
              : null;
            return (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:border-accent/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors overflow-hidden shrink-0">
                    {material.imagem_url ? (
                      <img
                        src={material.imagem_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {material.categoria && (
                      <Badge
                        variant="secondary"
                        className="text-xs gap-1 pl-1.5 pr-2"
                      >
                        {CatIcon ? (
                          <CatIcon className="h-3 w-3 shrink-0 opacity-90" />
                        ) : null}
                        {materialCategorias[material.categoria] ||
                          material.categoria}
                      </Badge>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {material.titulo}
                </h3>
                {material.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {material.descricao}
                  </p>
                )}
                {material.arquivo_url && (
                  <a
                    href={material.arquivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Baixar
                  </a>
                )}
                {(perm.edit || perm.delete) && (
                  <div className="flex gap-1 mt-3 pt-3 border-t border-border">
                    {perm.edit ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setEditingMaterial(material)}
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                    ) : null}
                    {perm.delete ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(material.id)}
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </Button>
                    ) : null}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

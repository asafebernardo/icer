import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  File,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSiteConfig } from "@/lib/siteConfig";
import {
  tipoIcons,
  getMaterialCategoriasList,
  getMaterialCategoriaLabelMap,
  categoriaIconComponent,
} from "./materiaisConfig";
import { MaterialForm } from "./MaterialForm";
import SafeImg from "@/components/shared/SafeImg";
import LinksUteisSection from "@/components/useful-links/LinksUteisSection";

export default function MateriaisTab({ perm }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [cfgTick, setCfgTick] = useState(0);

  useEffect(() => {
    const fn = () => setCfgTick((n) => n + 1);
    window.addEventListener("icer-site-config", fn);
    return () => window.removeEventListener("icer-site-config", fn);
  }, []);

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

  void cfgTick;
  const siteCfg = getSiteConfig();
  const categoriasLista = getMaterialCategoriasList(siteCfg);
  const labelMap = getMaterialCategoriaLabelMap(siteCfg);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">
          Materiais
        </h2>
        {perm.create ? (
          <Button
            className="w-fit shrink-0 gap-2 sm:self-center"
            onClick={() => {
              setShowForm(true);
              setEditingMaterial(null);
            }}
            aria-label="Novo material"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Material</span>
          </Button>
        ) : null}
      </div>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        {categoriasLista.map((c) => (
          <Button
            key={c.id}
            variant={filter === c.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(c.id)}
            className="rounded-full"
          >
            {c.label}
          </Button>
        ))}
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
            const IconTipo = tipoIcons[material.tipo] || File;
            const IconMat = material.icone_id
              ? categoriaIconComponent(material.icone_id)
              : IconTipo;
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
                      <SafeImg
                        src={material.imagem_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <IconMat className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      className="text-xs pl-1.5 pr-2"
                    >
                      {labelMap[material.categoria] ??
                        material.categoria ??
                        "—"}
                    </Badge>
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
                        aria-label="Editar"
                      >
                        <Pencil className="w-3 h-3" />
                        <span className="hidden sm:inline">Editar</span>
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

      <div className="mt-14 border-t border-border pt-12 lg:mt-16 lg:pt-14">
        <h2 className="text-lg font-semibold text-foreground tracking-tight mb-6">
          Links úteis
        </h2>
        <LinksUteisSection perm={perm} />
      </div>
    </div>
  );
}

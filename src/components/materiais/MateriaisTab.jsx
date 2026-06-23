import { useState, useEffect, useMemo } from "react";
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
  ExternalLink,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import {
  tipoIcons,
  categoriaIconComponent,
} from "./materiaisConfig";
import { MaterialForm } from "./MaterialForm";
import { LinkCardIcon } from "@/components/useful-links/LinkCardIcon";
import { UsefulLinkForm } from "@/components/useful-links/UsefulLinkForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIPO_LABELS = {
  pdf: "PDF",
  audio: "Áudio",
  video: "Vídeo",
  imagem: "Imagem",
  documento: "Documento",
  apresentacao: "Apresentação",
};

/**
 * Lista unificada de materiais + links úteis em cards pequenos.
 * Mostra: ícone, título, tipo e ação (Baixar / Acessar).
 */
export default function MateriaisTab({ perm, embedded = false }) {
  const queryClient = useQueryClient();
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    const load = () => {
      const cfg = getSiteConfig();
      setLinks(Array.isArray(cfg.linksUteis) ? cfg.linksUteis : []);
    };
    load();
    window.addEventListener("icer-site-config", load);
    return () => window.removeEventListener("icer-site-config", load);
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

  const createMaterialMutation = useMutation({
    mutationFn: (data) => api.entities.Material.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      setShowMaterialForm(false);
      toast.success("Material criado com sucesso.");
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Material.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      setEditingMaterial(null);
      toast.success("Material salvo com sucesso.");
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (id) => api.entities.Material.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materiais"] }),
  });

  const saveLinks = async (newLinks, successMessage) => {
    setLinks(newLinks);
    if (perm?.create || perm?.edit || perm?.delete) {
      try {
        await savePublicSiteConfigAdmin({ linksUteis: newLinks });
        await refreshPublicSiteConfig();
      } catch {
        setSiteConfig({ linksUteis: newLinks });
      }
    } else {
      setSiteConfig({ linksUteis: newLinks });
    }
    if (successMessage) toast.success(successMessage);
  };

  const handleAddLink = async (data) => {
    await saveLinks(
      [...links, { ...data, id: Date.now() }],
      "Link salvo com sucesso.",
    );
    setShowLinkForm(false);
  };
  const handleEditLink = async (data) => {
    await saveLinks(
      links.map((l) => (l.id === editingLink.id ? { ...l, ...data } : l)),
      "Link salvo com sucesso.",
    );
    setEditingLink(null);
  };
  const handleDeleteLink = (id) =>
    saveLinks(links.filter((l) => l.id !== id), "Link removido.");

  /** Itens unificados: materiais + links normalizados. */
  const items = useMemo(() => {
    const out = [];
    for (const m of materiais) {
      const url = String(m.arquivo_url ?? "").trim();
      if (!url) continue;
      out.push({
        key: `mat-${m.id}`,
        kind: "material",
        titulo: String(m.titulo ?? "").trim() || "(sem título)",
        typeKey: m.tipo || "documento",
        typeLabel: TIPO_LABELS[m.tipo] || "Material",
        actionUrl: url,
        actionLabel: "Baixar",
        actionIcon: Download,
        raw: m,
      });
    }
    for (const l of links) {
      const url = String(l.url ?? "").trim();
      if (!url) continue;
      out.push({
        key: `lnk-${l.id}`,
        kind: "link",
        titulo: String(l.titulo ?? "").trim() || "(sem título)",
        typeKey: "link",
        typeLabel: "Link",
        actionUrl: url,
        actionLabel: "Acessar",
        actionIcon: ExternalLink,
        raw: l,
      });
    }
    return out;
  }, [materiais, links]);

  const renderIcon = (item) => {
    if (item.kind === "material") {
      const IconTipo = tipoIcons[item.typeKey] || File;
      const IconMat = item.raw.icone_id
        ? categoriaIconComponent(item.raw.icone_id)
        : IconTipo;
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 group-hover:bg-accent/12 transition-colors shrink-0">
          <IconMat className="w-5 h-5 text-primary group-hover:text-accent transition-colors" />
        </span>
      );
    }
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40 shrink-0">
        <LinkCardIcon link={item.raw} className="w-5 h-5" />
      </span>
    );
  };

  return (
    <div>
      {(perm.create || perm.edit) ? (
        <div
          className={cn(
            "mb-6 flex flex-wrap items-center gap-2",
            embedded ? "justify-end" : "flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          )}
        >
          {!embedded ? (
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Materiais e links
            </h2>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {perm.create ? (
              <>
                <Button
                  variant="outline"
                  className="w-fit gap-2"
                  onClick={() => {
                    setShowMaterialForm(true);
                    setEditingMaterial(null);
                  }}
                  aria-label="Novo material"
                >
                  <Plus className="w-4 h-4" />
                  <span>Material</span>
                </Button>
                <Button
                  className="w-fit gap-2"
                  onClick={() => {
                    setShowLinkForm(true);
                    setEditingLink(null);
                  }}
                  aria-label="Novo link"
                >
                  <Plus className="w-4 h-4" />
                  <span>Link</span>
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {(perm.create || perm.edit) && (
        <Dialog
          open={Boolean(showMaterialForm || editingMaterial)}
          onOpenChange={(o) => {
            if (!o) {
              setShowMaterialForm(false);
              setEditingMaterial(null);
            }
          }}
        >
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? "Editar material" : "Novo material"}
              </DialogTitle>
            </DialogHeader>
            {(showMaterialForm || editingMaterial) && (
              <MaterialForm
                inDialog
                key={editingMaterial?.id ?? "new-material"}
                material={editingMaterial || undefined}
                onSave={(d) => {
                  if (editingMaterial) {
                    updateMaterialMutation.mutate({
                      id: editingMaterial.id,
                      data: d,
                    });
                  } else {
                    createMaterialMutation.mutate(d);
                  }
                }}
                onCancel={() => {
                  setShowMaterialForm(false);
                  setEditingMaterial(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {(perm.create || perm.edit) && (
        <Dialog
          open={Boolean(showLinkForm || editingLink)}
          onOpenChange={(o) => {
            if (!o) {
              setShowLinkForm(false);
              setEditingLink(null);
            }
          }}
        >
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLink ? "Editar link" : "Novo link"}
              </DialogTitle>
            </DialogHeader>
            {(showLinkForm || editingLink) && (
              <UsefulLinkForm
                inDialog
                key={editingLink?.id ?? "new-link"}
                link={editingLink || undefined}
                onSave={(data) => {
                  if (editingLink) handleEditLink(data);
                  else handleAddLink(data);
                }}
                onCancel={() => {
                  setShowLinkForm(false);
                  setEditingLink(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nada por aqui ainda"
          description="Em breve novos materiais e links serão disponibilizados."
          compact
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item, index) => {
            const ActionIcon = item.actionIcon;
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.02, 0.2) }}
                className="group bg-card rounded-xl border border-border p-3 card-hover hover:border-accent/30 flex items-center gap-3 min-w-0"
              >
                {renderIcon(item)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {item.titulo}
                    </h3>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="h-5 text-[10px] font-medium px-1.5"
                    >
                      {item.typeLabel}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={item.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.actionLabel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors focus-ring"
                  >
                    <ActionIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{item.actionLabel}</span>
                  </a>
                  {(perm.edit || perm.delete) && (
                    <div className="flex items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      {perm.edit ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7"
                          onClick={() => {
                            if (item.kind === "material") {
                              setEditingMaterial(item.raw);
                            } else {
                              setEditingLink(item.raw);
                            }
                          }}
                          aria-label="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                      {perm.delete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (item.kind === "material") {
                              deleteMaterialMutation.mutate(item.raw.id);
                            } else {
                              handleDeleteLink(item.raw.id);
                            }
                          }}
                          aria-label="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

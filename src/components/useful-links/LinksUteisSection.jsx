import { useState, useEffect } from "react";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import { LinkCardIcon } from "./LinkCardIcon";
import { UsefulLinkForm } from "./UsefulLinkForm";
import { toast } from "sonner";

const linkCategoriaBg = {
  Bíblia:
    "border border-primary/25 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/15 dark:text-primary",
  Estudos:
    "border border-accent/30 bg-accent/10 text-accent dark:border-accent/35 dark:bg-accent/15 dark:text-accent",
  Música:
    "border border-category-jovens/30 bg-category-jovens/10 text-category-jovens dark:border-category-jovens/35 dark:bg-category-jovens/12",
  Notícias:
    "border border-category-homens/30 bg-category-homens/10 text-category-homens dark:border-category-homens/35 dark:bg-category-homens/12",
  Recursos:
    "border border-category-mulheres/30 bg-category-mulheres/10 text-category-mulheres dark:border-category-mulheres/35 dark:bg-category-mulheres/12",
};

/**
 * Lista de links úteis (siteConfig.linksUteis), com filtros e CRUD quando permitido.
 */
export default function LinksUteisSection({ perm }) {
  const [links, setLinks] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  useEffect(() => {
    const load = () => {
      const cfg = getSiteConfig();
      setLinks(Array.isArray(cfg.linksUteis) ? cfg.linksUteis : []);
    };
    load();
    window.addEventListener("icer-site-config", load);
    return () => window.removeEventListener("icer-site-config", load);
  }, []);

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

  const handleAdd = async (data) => {
    await saveLinks([...links, { ...data, id: Date.now() }], "Link salvo com sucesso.");
    setShowForm(false);
  };
  const handleEdit = async (data) => {
    await saveLinks(
      links.map((l) => (l.id === editingLink.id ? { ...l, ...data } : l)),
      "Link salvo com sucesso.",
    );
    setEditingLink(null);
  };
  const handleDelete = (id) => saveLinks(links.filter((l) => l.id !== id), "Link removido.");

  const allCats = [
    "Todos",
    ...new Set(links.map((l) => l.categoria).filter(Boolean)),
  ];
  const filtered =
    filter === "Todos" ? links : links.filter((l) => l.categoria === filter);

  return (
    <div>
      {perm.create ? (
        <div className="flex justify-end mb-4">
          <Button
            className="w-fit gap-2"
            onClick={() => {
              setShowForm(true);
              setEditingLink(null);
            }}
            aria-label="Adicionar link"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adicionar Link</span>
          </Button>
        </div>
      ) : null}
      {(perm.create || perm.edit) && (
        <Dialog
          open={Boolean(showForm || editingLink)}
          onOpenChange={(o) => {
            if (!o) {
              setShowForm(false);
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
            {(showForm || editingLink) && (
              <UsefulLinkForm
                inDialog
                key={editingLink?.id ?? "new-link"}
                link={editingLink || undefined}
                onSave={(data) => {
                  if (editingLink) handleEdit(data);
                  else handleAdd(data);
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingLink(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
        {allCats.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === cat ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((link, i) => (
          <motion.div
            key={link.id}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="group bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-accent/30 transition-all duration-300 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <LinkCardIcon link={link} />
                    <h3 className="font-semibold text-foreground truncate">
                      {link.titulo}
                    </h3>
                  </div>
                  {link.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {link.descricao}
                    </p>
                  )}
                </div>
                {link.categoria && (
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${linkCategoriaBg[link.categoria] || "bg-muted text-muted-foreground border-border"}`}
                  >
                    {link.categoria}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                >
                  Acessar <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {(perm.edit || perm.delete) && (
                  <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    {perm.edit ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        onClick={() => setEditingLink(link)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    ) : null}
                    {perm.delete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(link.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

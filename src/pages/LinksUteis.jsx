import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import PageHeader from "../components/shared/PageHeader";
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { LinkCardIcon } from "@/components/useful-links/LinkCardIcon";
import { UsefulLinkForm } from "@/components/useful-links/UsefulLinkForm";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";

const categorias = [
  "Todos",
  "Bíblia",
  "Estudos",
  "Música",
  "Notícias",
  "Recursos",
];

const categoriaBg = {
  Bíblia:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-zinc-800/50 dark:text-zinc-200 dark:border-zinc-600",
  Estudos:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
  Música:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
  Notícias:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
  Recursos:
    "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800",
};

export default function LinksUteis() {
  const user = useSyncedAuthUser();
  const perm = useMemo(
    () => ({
      create: canMenuAction(user, MENU.RECURSOS, "create"),
      edit: canMenuAction(user, MENU.RECURSOS, "edit"),
      delete: canMenuAction(user, MENU.RECURSOS, "delete"),
    }),
    [user],
  );
  const [links, setLinks] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  useEffect(() => {
    const loadLinks = () => {
      const cfg = getSiteConfig();
      setLinks(Array.isArray(cfg.linksUteis) ? cfg.linksUteis : []);
    };
    loadLinks();
    window.addEventListener("icer-site-config", loadLinks);
    return () => window.removeEventListener("icer-site-config", loadLinks);
  }, []);

  const saveLinks = (newLinks) => {
    setLinks(newLinks);
    setSiteConfig({ linksUteis: newLinks });
  };

  const handleAdd = (data) => {
    const newLinks = [...links, { ...data, id: Date.now() }];
    saveLinks(newLinks);
    setShowForm(false);
  };

  const handleEdit = (data) => {
    const newLinks = links.map((l) =>
      l.id === editingLink.id ? { ...l, ...data } : l,
    );
    saveLinks(newLinks);
    setEditingLink(null);
  };

  const handleDelete = (id) => {
    saveLinks(links.filter((l) => l.id !== id));
  };

  const allCats = [
    "Todos",
    ...new Set(links.map((l) => l.categoria).filter(Boolean)),
  ];
  const filtered =
    filter === "Todos" ? links : links.filter((l) => l.categoria === filter);

  return (
    <div>
      <PageHeader
        pageKey="links"
        tag="Comunidade"
        title="Links Úteis"
        description="Recursos e referências para enriquecer sua fé e conhecimento bíblico."
      />

      <section className="py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {perm.create && (
            <div className="flex justify-end mb-6">
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                onClick={() => {
                  setShowForm(true);
                  setEditingLink(null);
                }}
              >
                <Plus className="w-4 h-4" /> Adicionar Link
              </Button>
            </div>
          )}

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

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 mb-8">
            {allCats.map((cat) => (
              <button
                key={cat}
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
                          className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${categoriaBg[link.categoria] || "bg-muted text-muted-foreground border-border"}`}
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
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </section>
    </div>
  );
}

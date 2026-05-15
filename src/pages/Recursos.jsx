import { useState, useEffect, useMemo, useRef } from "react";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { LinkCardIcon } from "@/components/useful-links/LinkCardIcon";
import { UsefulLinkForm } from "@/components/useful-links/UsefulLinkForm";
import MateriaisTab from "@/components/materiais/MateriaisTab";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";

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

function LinksUteisTab({
  perm,
  hideTopCreateButton = false,
  openCreateSignal = 0,
}) {
  const [links, setLinks] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const prevOpenCreateSig = useRef(0);

  useEffect(() => {
    if (!hideTopCreateButton) return;
    if (openCreateSignal > prevOpenCreateSig.current) {
      setShowForm(true);
      setEditingLink(null);
    }
    prevOpenCreateSig.current = openCreateSignal;
  }, [hideTopCreateButton, openCreateSignal]);

  useEffect(() => {
    const load = () => {
      const cfg = getSiteConfig();
      setLinks(Array.isArray(cfg.linksUteis) ? cfg.linksUteis : []);
    };
    load();
    window.addEventListener("icer-site-config", load);
    return () => window.removeEventListener("icer-site-config", load);
  }, []);

  const saveLinks = (newLinks) => {
    setLinks(newLinks);
    setSiteConfig({ linksUteis: newLinks });
  };

  const handleAdd = (data) => {
    saveLinks([...links, { ...data, id: Date.now() }]);
    setShowForm(false);
  };
  const handleEdit = (data) => {
    saveLinks(
      links.map((l) => (l.id === editingLink.id ? { ...l, ...data } : l)),
    );
    setEditingLink(null);
  };
  const handleDelete = (id) => saveLinks(links.filter((l) => l.id !== id));

  const allCats = [
    "Todos",
    ...new Set(links.map((l) => l.categoria).filter(Boolean)),
  ];
  const filtered =
    filter === "Todos" ? links : links.filter((l) => l.categoria === filter);

  return (
    <div>
      {perm.create && !hideTopCreateButton && (
        <div className="flex justify-end mb-4">
          <Button
            className="w-fit gap-2"
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
  );
}

export default function Recursos() {
  const [tab, setTab] = useState("materiais");
  const [linkCreateSignal, setLinkCreateSignal] = useState(0);
  const [materialCreateSignal, setMaterialCreateSignal] = useState(0);
  const user = useSyncedAuthUser();

  useEffect(() => {
    if (tab !== "materiais") setMaterialCreateSignal(0);
    if (tab !== "links") setLinkCreateSignal(0);
  }, [tab]);
  const permRecursos = useMemo(
    () => ({
      create: canMenuAction(user, MENU.RECURSOS, "create"),
      edit: canMenuAction(user, MENU.RECURSOS, "edit"),
      delete: canMenuAction(user, MENU.RECURSOS, "delete"),
    }),
    [user],
  );
  const permMateriais = useMemo(
    () => ({
      create: canMenuAction(user, MENU.MATERIAIS_TAB, "create"),
      edit: canMenuAction(user, MENU.MATERIAIS_TAB, "edit"),
      delete: canMenuAction(user, MENU.MATERIAIS_TAB, "delete"),
    }),
    [user],
  );

  return (
    <div>
      <PageHeader
        pageKey="recursos"
        tag="Edificação"
        title="Recursos"
        description="Materiais de apoio e endereços selecionados para estudo, leitura e referência espiritual."
      />
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex flex-wrap gap-1 bg-muted rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={() => setTab("materiais")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === "materiais" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Materiais
              </button>
              <button
                type="button"
                onClick={() => setTab("links")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === "links" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Links Úteis
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2 shrink-0 sm:min-h-10 sm:items-center">
              {tab === "materiais" && permMateriais.create ? (
                <Button
                  type="button"
                  className="w-fit gap-2"
                  onClick={() => setMaterialCreateSignal((n) => n + 1)}
                >
                  <Plus className="w-4 h-4" /> Novo Material
                </Button>
              ) : null}
              {tab === "links" && permRecursos.create ? (
                <Button
                  type="button"
                  className="w-fit gap-2"
                  onClick={() => setLinkCreateSignal((n) => n + 1)}
                >
                  <Plus className="w-4 h-4" /> Adicionar Link
                </Button>
              ) : null}
            </div>
          </div>
          {tab === "materiais" && (
            <MateriaisTab
              perm={permMateriais}
              hideCreateButton
              openCreateSignal={materialCreateSignal}
            />
          )}
          {tab === "links" && (
            <LinksUteisTab
              perm={permRecursos}
              hideTopCreateButton
              openCreateSignal={linkCreateSignal}
            />
          )}
        </div>
      </section>
    </div>
  );
}

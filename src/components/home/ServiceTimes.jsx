import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Trash2 } from "lucide-react";

import BackgroundSlideshow from "@/components/shared/BackgroundSlideshow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { useHeroBackground } from "@/lib/useHeroBackground";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";

const CONFIG_KEY = "serviceTimes";

const DEFAULT_CARDS = [
  {
    id: "culto-dominical",
    title: "Culto Dominical",
    dateLabel: "Domingos — 9h e 19h",
    description:
      "Tempo onde estudamos a palavra de Deus de forma expositiva. Venha estudar a palavra de Deus conosco.",
    imageUrl: "",
    highlight: true,
  },
  {
    id: "reuniao-oracao",
    title: "Reunião de oração",
    dateLabel: "Quarta — 19h45",
    description: "",
    imageUrl: "",
    highlight: false,
  },
  {
    id: "encontro-feminino",
    title: "Encontro feminino",
    dateLabel: "Segundo sábado de cada mês",
    description: "",
    imageUrl: "",
    highlight: false,
  },
  {
    id: "reuniao-homens",
    title: "Reunião de homens",
    dateLabel: "Terceiro sábado de cada mês",
    description: "",
    imageUrl: "",
    highlight: false,
  },
  {
    id: "encontro-casais",
    title: "Encontro de casais",
    dateLabel: "Último sábado de cada mês",
    description: "",
    imageUrl: "",
    highlight: false,
  },
];

function normalizeCardImages(c) {
  const urls = Array.isArray(c.imageUrls)
    ? c.imageUrls.filter(Boolean)
    : [];
  if (urls.length > 0) return urls;
  if (c.imageUrl) return [c.imageUrl];
  return [];
}

function loadCards() {
  const cfg = getSiteConfig();
  const saved = cfg[CONFIG_KEY]?.cards;
  if (Array.isArray(saved) && saved.length > 0) {
    const max = DEFAULT_CARDS.length - 1;
    const list = saved.map((c, i) => {
      const d = DEFAULT_CARDS[Math.min(i, max)] || {};
      const merged = {
        ...d,
        ...c,
        id: c.id || d.id || `card-${i}`,
        dateLabel: c.dateLabel ?? c.time ?? d.dateLabel ?? "",
        description: c.description ?? d.description ?? "",
        imageUrl: c.imageUrl ?? d.imageUrl ?? "",
        highlight: !!c.highlight,
      };
      const imageUrls = normalizeCardImages(merged);
      return {
        ...merged,
        imageUrls,
        imageUrl: imageUrls[0] || "",
      };
    });
    if (!list.some((x) => x.highlight) && list.length > 0) {
      list[0] = { ...list[0], highlight: true };
    }
    return list;
  }
  return DEFAULT_CARDS.map((c) => {
    const imageUrls = normalizeCardImages(c);
    return { ...c, imageUrls, imageUrl: imageUrls[0] || "" };
  });
}

export default function ServiceTimes() {
  const { rotateIntervalMs, transitionMs, transitionMode } =
    useHeroBackground();
  const user = useSyncedAuthUser();
  const canEditHome = canMenuAction(user, MENU.HOME, "edit");
  const [cards, setCards] = useState(loadCards);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const fileInputRef = useRef(null);

  const persist = useCallback((nextCards) => {
    setSiteConfig({ [CONFIG_KEY]: { cards: nextCards } });
    setCards(nextCards);
  }, []);

  useEffect(() => {
    const onStorage = () => setCards(loadCards());
    window.addEventListener("storage", onStorage);
    window.addEventListener("icer-site-config", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("icer-site-config", onStorage);
    };
  }, []);

  const openEdit = (card) => {
    const imageUrls = normalizeCardImages(card);
    setDraft({ ...card, imageUrls, imageUrl: imageUrls[0] || "" });
    setEditOpen(true);
  };

  const saveDraft = () => {
    if (!draft?.id) return;
    const imageUrls = (draft.imageUrls || []).filter(Boolean);
    const payload = {
      ...draft,
      imageUrls,
      imageUrl: imageUrls[0] || "",
    };
    let next = cards.map((c) => (c.id === draft.id ? payload : c));
    if (draft.highlight) {
      next = next.map((c) => ({
        ...c,
        highlight: c.id === draft.id,
      }));
    }
    persist(next);
    setEditOpen(false);
    setDraft(null);
  };

  const onPickImages = (e) => {
    const files = e.target.files;
    if (!files?.length || !draft) return;
    void (async () => {
      const added = await Promise.all(
        Array.from(files).map((f) => imageFileToStorableUrl(f)),
      );
      setDraft((d) => {
        if (!d) return d;
        const nextUrls = [...(d.imageUrls || []).filter(Boolean), ...added];
        return {
          ...d,
          imageUrls: nextUrls,
          imageUrl: nextUrls[0] || "",
        };
      });
    })();
    e.target.value = "";
  };

  const removeImageAt = (idx) => {
    setDraft((d) => {
      if (!d) return d;
      const nextUrls = (d.imageUrls || []).filter((_, i) => i !== idx);
      return {
        ...d,
        imageUrls: nextUrls,
        imageUrl: nextUrls[0] || "",
      };
    });
  };

  const clearImages = () => {
    setDraft((d) =>
      d ? { ...d, imageUrls: [], imageUrl: "" } : d,
    );
  };

  const highlighted = cards.filter((s) => s.highlight);
  const others = cards.filter((s) => !s.highlight);

  const cardImageUrls = (card) => normalizeCardImages(card);

  return (
    <section className="py-20 lg:py-28 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-accent font-semibold text-sm tracking-wider uppercase mb-3">
            Nossos cultos
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Horários de Funcionamento
          </h2>
          <div className="mt-4 w-16 h-1 rounded-full bg-accent/60" />
          <p className="mt-5 text-muted-foreground max-w-xl">
            Participe dos nossos encontros semanais. Há sempre um lugar para
            você.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {highlighted.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative lg:row-span-1 bg-primary text-primary-foreground rounded-2xl overflow-hidden shadow-lg flex flex-col"
            >
              {canEditHome && (
                <button
                  type="button"
                  onClick={() => openEdit(service)}
                  className="absolute top-3 right-3 z-20 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/20"
                >
                  Editar
                </button>
              )}
              {cardImageUrls(service).length > 0 ? (
                <div className="relative w-full h-48 sm:h-56 shrink-0 overflow-hidden">
                  <BackgroundSlideshow
                    urls={cardImageUrls(service)}
                    rotateIntervalMs={rotateIntervalMs}
                    transitionMs={transitionMs}
                    transitionMode={transitionMode}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="h-3 shrink-0 bg-white/10" />
              )}
              <div className="p-8 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="font-semibold text-xl mb-2">{service.title}</h3>
                  <p className="text-sm font-medium text-white/80 mb-4">
                    {service.dateLabel}
                  </p>
                  {service.description ? (
                    <p className="text-sm text-white/65 leading-relaxed">
                      {service.description}
                    </p>
                  ) : null}
                </div>
                <div className="mt-8 pt-6 border-t border-white/20">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                    Culto principal
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {others.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index + 1) * 0.08, duration: 0.5 }}
                className="relative group bg-card rounded-2xl border border-border overflow-hidden hover:border-accent/40 hover:shadow-md transition-all duration-300 flex flex-col"
              >
                {canEditHome && (
                  <button
                    type="button"
                    onClick={() => openEdit(service)}
                    className="absolute top-3 right-3 z-20 text-xs font-medium px-3 py-1.5 rounded-lg bg-background/90 border border-border hover:bg-muted"
                  >
                    Editar
                  </button>
                )}
                {cardImageUrls(service).length > 0 ? (
                  <div className="relative w-full h-40 sm:h-44 shrink-0 overflow-hidden">
                    <BackgroundSlideshow
                      urls={cardImageUrls(service)}
                      rotateIntervalMs={rotateIntervalMs}
                      transitionMs={transitionMs}
                      transitionMode={transitionMode}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card from-0% via-card/55 via-35% to-transparent to-75%"
                      aria-hidden
                    />
                  </div>
                ) : null}
                <div className="relative flex-1 flex flex-col p-6 overflow-hidden">
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/[0.11] from-0% via-secondary/55 via-40% to-transparent to-90% dark:from-accent/15 dark:via-secondary/25"
                    aria-hidden
                  />
                  <div className="relative z-[1] flex flex-col flex-1">
                    <h3 className="font-semibold text-foreground text-base mb-1 pr-16">
                      {service.title}
                    </h3>
                    <p className="text-sm font-medium text-accent mb-2">
                      {service.dateLabel}
                    </p>
                    {service.description ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar horário</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="st-title">Título</Label>
                <Input
                  id="st-title"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-date">Data / horário do evento</Label>
                <Input
                  id="st-date"
                  value={draft.dateLabel}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, dateLabel: e.target.value }))
                  }
                  placeholder="Ex.: Domingos — 9h e 19h"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-desc">Descrição (opcional)</Label>
                <Textarea
                  id="st-desc"
                  rows={3}
                  value={draft.description || ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Imagens do card (carrossel)</Label>
                <p className="text-xs text-muted-foreground">
                  Várias fotos alternam como no hero da página inicial (intervalo,
                  duração e tipo de transição são os definidos em{" "}
                  <span className="font-medium text-foreground">
                    Fundos do hero
                  </span>
                  ).
                </p>
                {(draft.imageUrls || []).length > 0 ? (
                  <ul className="space-y-2 border rounded-lg p-2 max-h-40 overflow-y-auto">
                    {(draft.imageUrls || []).map((src, i) => (
                      <li
                        key={`${i}-${String(src).slice(0, 36)}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="truncate flex-1 text-muted-foreground">
                          Imagem {i + 1}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0 h-8 w-8"
                          onClick={() => removeImageAt(i)}
                          aria-label={`Remover imagem ${i + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma imagem. Adicione ficheiros abaixo.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={(el) => {
                      fileInputRef.current = el;
                    }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/*"
                    multiple
                    className="hidden"
                    onChange={onPickImages}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Adicionar imagens
                  </Button>
                  {(draft.imageUrls || []).length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearImages}
                    >
                      Limpar todas
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Card principal</p>
                  <p className="text-xs text-muted-foreground">
                    Destaque na primeira coluna (só um ativo)
                  </p>
                </div>
                <Switch
                  checked={!!draft.highlight}
                  onCheckedChange={(v) =>
                    setDraft((d) => (d ? { ...d, highlight: v } : d))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={saveDraft}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Trash2, Plus } from "lucide-react";

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

import HomeSectionBackdrop from "@/components/home/HomeSectionBackdrop";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import { useHeroBackground } from "@/lib/useHeroBackground";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { imageScrimFlat, imageScrimBottom } from "@/lib/imageScrimClasses";
import { homeSectionSolidContent } from "@/lib/homeSectionSolidClasses";
import { SECTION_BG_KEYS } from "@/lib/homeContentDefaults";

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

const FALLBACK_TEMPLATE = () => ({
  ...DEFAULT_CARDS[DEFAULT_CARDS.length - 1],
  id: `card-${Date.now()}`,
  title: "Novo horário",
  dateLabel: "",
  description: "",
  imageUrl: "",
  highlight: false,
});

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
    const list = saved.map((c, i) => {
      const d =
        DEFAULT_CARDS[Math.min(i, DEFAULT_CARDS.length - 1)] ||
        DEFAULT_CARDS[0];
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

function sortCardsDisplay(list) {
  return [...list].sort((a, b) => {
    if (a.highlight === b.highlight) return 0;
    return a.highlight ? -1 : 1;
  });
}

export default function ServiceTimes() {
  const { rotateIntervalMs, transitionMs, transitionMode } =
    useHeroBackground();
  const user = useSyncedAuthUser();
  const canEditHome = canMenuAction(user, MENU.HOME, "edit");
  const [sectionBgUrl, setSectionBgUrl] = useState("");
  const [cards, setCards] = useState(loadCards);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const fileInputRef = useRef(null);

  const persist = useCallback(
    (nextCards) => {
      const patch = { [CONFIG_KEY]: { cards: nextCards } };
      if (canEditHome) {
        savePublicSiteConfigAdmin(patch)
          .then(() => refreshPublicSiteConfig())
          .catch(() => {
            setSiteConfig(patch);
          });
      } else {
        setSiteConfig(patch);
      }
      setCards(nextCards);
    },
    [canEditHome],
  );

  useEffect(() => {
    const sync = () => {
      setSectionBgUrl(
        String(getSiteConfig()[SECTION_BG_KEYS.serviceTimes] || "").trim(),
      );
      setCards(loadCards());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("icer-site-config", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("icer-site-config", sync);
    };
  }, []);

  const openEdit = (card) => {
    const imageUrls = normalizeCardImages(card);
    setDraft({ ...card, imageUrls, imageUrl: imageUrls[0] || "" });
    setIsNewCard(false);
    setEditOpen(true);
  };

  const openNewCard = () => {
    const base = FALLBACK_TEMPLATE();
    const imageUrls = normalizeCardImages(base);
    setDraft({ ...base, imageUrls, imageUrl: "" });
    setIsNewCard(true);
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
    let next;
    if (isNewCard || !cards.some((c) => c.id === draft.id)) {
      next = [...cards, payload];
    } else {
      next = cards.map((c) => (c.id === draft.id ? payload : c));
    }
    if (draft.highlight) {
      next = next.map((c) => ({
        ...c,
        highlight: c.id === draft.id,
      }));
    }
    persist(next);
    setEditOpen(false);
    setDraft(null);
    setIsNewCard(false);
  };

  const removeCard = () => {
    if (!draft?.id) return;
    const next = cards.filter((c) => c.id !== draft.id);
    if (next.length === 0) {
      toast.error("Tem de existir pelo menos um horário.");
      return;
    }
    let adjusted = next;
    if (!next.some((c) => c.highlight)) {
      adjusted = next.map((c, i) => ({ ...c, highlight: i === 0 }));
    }
    persist(adjusted);
    setEditOpen(false);
    setDraft(null);
    setIsNewCard(false);
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

  const cardImageUrls = (card) => normalizeCardImages(card);
  const displayCards = sortCardsDisplay(cards);
  const solidHeader = !sectionBgUrl;

  return (
    <>
      <HomeSectionBackdrop
        imageUrl={sectionBgUrl}
        className="py-16 sm:py-20 lg:py-28"
      >
        <div className="container-page min-w-0">
        {canEditHome && (
          <div className="flex flex-wrap justify-end gap-2 mb-6">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={openNewCard}
            >
              <Plus className="w-4 h-4" />
              Novo horário
            </Button>
          </div>
        )}
        <div
          className={cn(
            "flex flex-col items-center text-center mb-12 sm:mb-16",
            solidHeader && homeSectionSolidContent,
          )}
        >
          <span className="text-accent font-semibold text-sm tracking-wider uppercase mb-3">
            Nossos cultos
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
            Horários de Funcionamento
          </h2>
          <div className="mt-4 w-16 h-1 rounded-full bg-accent/60" />
          <p className="mt-5 text-muted-foreground max-w-xl">
            Participe dos nossos encontros semanais. Há sempre um lugar para
            você.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {displayCards.map((service, index) => {
            const urls = cardImageUrls(service);
            const hasImages = urls.length > 0;
            const isHighlight = service.highlight;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.45 }}
                className={`relative flex w-full overflow-hidden rounded-sm border shadow-card flex-col ${
                  isHighlight
                    ? "sm:col-span-2 min-h-[min(360px,44vh)] sm:min-h-[min(420px,48vh)] ring-2 ring-accent/70 border-accent/40"
                    : "min-h-[min(280px,34vh)] sm:min-h-[min(300px,36vh)] border-border/80"
                }`}
              >
                {canEditHome && (
                  <button
                    type="button"
                    onClick={() => openEdit(service)}
                    className={`absolute top-3 right-3 z-30 text-xs font-medium px-3 py-1.5 rounded-sm border backdrop-blur-sm ${
                      hasImages
                        ? "bg-black/45 text-white border-white/25 hover:bg-black/55"
                        : "bg-background/90 border-border hover:bg-muted"
                    }`}
                  >
                    Editar
                  </button>
                )}

                {hasImages ? (
                  <>
                    <div className="absolute inset-0 z-0">
                      <BackgroundSlideshow
                        urls={urls}
                        rotateIntervalMs={rotateIntervalMs}
                        transitionMs={transitionMs}
                        transitionMode={transitionMode}
                      />
                    </div>
                    <div className={imageScrimFlat} aria-hidden />
                    <div className={imageScrimBottom} aria-hidden />
                  </>
                ) : (
                  <>
                    <div
                      className={`absolute inset-0 z-0 ${
                        isHighlight
                          ? "bg-gradient-to-br from-primary via-primary to-primary/90"
                          : "bg-gradient-to-br from-card to-muted/80"
                      }`}
                      aria-hidden
                    />
                    <div
                      className={`pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[55%] min-h-[140px] bg-gradient-to-t ${
                        isHighlight
                          ? "from-black/35 via-black/15 to-transparent"
                          : "from-black/22 via-black/8 to-transparent"
                      }`}
                      aria-hidden
                    />
                  </>
                )}

                <div
                  className={`relative z-20 mt-auto flex flex-col justify-end min-h-[140px] flex-1 ${
                    isHighlight
                      ? "px-6 py-6 sm:px-10 sm:py-8 min-h-[min(180px,28vh)] sm:min-h-[200px]"
                      : "px-5 py-5 sm:px-6 sm:py-6"
                  } ${
                    hasImages || isHighlight
                      ? "text-white"
                      : "text-foreground"
                  }`}
                >
                  {isHighlight && (
                    <p
                      className={`mb-2 sm:mb-3 text-xs sm:text-sm font-bold uppercase tracking-[0.18em] ${
                        hasImages || isHighlight
                          ? "text-white/85"
                          : "text-accent"
                      }`}
                    >
                      Destaque
                    </p>
                  )}
                  <h3
                    className={`font-display font-semibold leading-tight mb-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] ${
                      isHighlight
                        ? "text-2xl sm:text-3xl lg:text-4xl"
                        : "text-xl sm:text-2xl"
                    } ${
                      !hasImages && !isHighlight ? "text-foreground [text-shadow:none]" : ""
                    }`}
                  >
                    {service.title}
                  </h3>
                  <p
                    className={`font-medium mb-3 ${
                      isHighlight
                        ? "text-base sm:text-lg"
                        : "text-sm"
                    } ${
                      hasImages || isHighlight
                        ? "text-white/92 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]"
                        : "text-accent"
                    }`}
                  >
                    {service.dateLabel}
                  </p>
                  {service.description ? (
                    <p
                      className={`leading-relaxed max-w-prose ${
                        isHighlight
                          ? "text-base sm:text-[1.05rem] max-w-3xl"
                          : "text-sm"
                      } ${
                        hasImages || isHighlight
                          ? "text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {service.description}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      </HomeSectionBackdrop>

      <Dialog open={editOpen} onOpenChange={(o) => {
        setEditOpen(o);
        if (!o) {
          setDraft(null);
          setIsNewCard(false);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNewCard ? "Novo horário" : "Editar horário"}
            </DialogTitle>
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
                <Label>Imagens do card (carrossel — ocupam o card inteiro)</Label>
                <p className="text-xs text-muted-foreground">
                  As fotos cobrem todo o cartão; o texto fica sobreposto embaixo.
                  Intervalo e transição seguem as definições de «Fundos do hero».
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
                          size="sm"
                          variant="ghost"
                          className="shrink-0 h-8 gap-1 px-2"
                          onClick={() => removeImageAt(i)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma imagem — o cartão usa cor de fundo.
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
                  <p className="text-sm font-medium">Card em destaque</p>
                  <p className="text-xs text-muted-foreground">
                    Só um ativo; aparece primeiro na lista.
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
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {!isNewCard && draft?.id ? (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto mr-auto"
                onClick={removeCard}
              >
                Remover horário
              </Button>
            ) : (
              <span />
            )}
            <div className="flex w-full sm:w-auto gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button variant="success" onClick={saveDraft}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

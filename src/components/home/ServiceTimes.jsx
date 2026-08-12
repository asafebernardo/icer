import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ImagePlus, Trash2, Plus } from "lucide-react";

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

import ServiceTimesVariantEditorial from "@/components/home/service-times/ServiceTimesVariantEditorial";
import {
  cardsToEventViews,
  normalizeCardImages,
} from "@/components/home/service-times/serviceTimesModel";
import useSiteContactDetails from "@/hooks/useSiteContactDetails";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import { useHeroBackground } from "@/lib/useHeroBackground";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { MENU } from "@/lib/auth";
import useCanEdit from "@/lib/useCanEdit";
import { SECTION_BG_KEYS } from "@/lib/homeContentDefaults";
import { toast } from "sonner";

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

export default function ServiceTimes({ standalone = false } = {}) {
  const { rotateIntervalMs, transitionMs, transitionMode } =
    useHeroBackground();
  const contact = useSiteContactDetails();
  const canEditHome = useCanEdit(MENU.HOME);
  const [sectionBgUrl, setSectionBgUrl] = useState("");
  const [cards, setCards] = useState(loadCards);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const fileInputRef = useRef(null);

  const persist = useCallback(
    (nextCards, successMessage) => {
      const patch = { [CONFIG_KEY]: { cards: nextCards } };
      if (canEditHome) {
        savePublicSiteConfigAdmin(patch)
          .then(() => refreshPublicSiteConfig())
          .then(() => {
            if (successMessage) toast.success(successMessage);
          })
          .catch(() => {
            setSiteConfig(patch);
            if (successMessage) toast.success(successMessage);
          });
      } else {
        setSiteConfig(patch);
        if (successMessage) toast.success(successMessage);
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
    persist(next, "Horário salvo com sucesso.");
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
    persist(adjusted, "Horário removido.");
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
    setDraft((d) => (d ? { ...d, imageUrls: [], imageUrl: "" } : d));
  };

  const events = useMemo(
    () =>
      cardsToEventViews(cards, {
        location: contact.endereco,
        mapsHref: contact.mapsHref,
        sectionBgUrl,
      }),
    [cards, contact.endereco, contact.mapsHref, sectionBgUrl],
  );

  const slideshow = useMemo(
    () => ({ rotateIntervalMs, transitionMs, transitionMode }),
    [rotateIntervalMs, transitionMs, transitionMode],
  );

  const variantProps = {
    standalone,
    sectionBgUrl,
    events,
    canEdit: canEditHome,
    onEdit: openEdit,
    mapsHref: contact.mapsHref,
    slideshow,
  };

  return (
    <>
      {canEditHome ? (
        <div className="container-page flex flex-wrap justify-end gap-2 py-4">
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={openNewCard}
            aria-label="Novo horário"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo horário</span>
          </Button>
        </div>
      ) : null}

      <ServiceTimesVariantEditorial {...variantProps} />

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) {
            setDraft(null);
            setIsNewCard(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNewCard ? "Novo horário" : "Editar horário"}
            </DialogTitle>
          </DialogHeader>
          {draft ? (
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
                  <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                    {(draft.imageUrls || []).map((src, i) => (
                      <li
                        key={`${i}-${String(src).slice(0, 36)}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="flex-1 truncate text-muted-foreground">
                          Imagem {i + 1}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 shrink-0 gap-1 px-2"
                          onClick={() => removeImageAt(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
                    <ImagePlus className="mr-2 h-4 w-4" />
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
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {!isNewCard && draft?.id ? (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto w-full sm:w-auto"
                onClick={removeCard}
              >
                Remover horário
              </Button>
            ) : (
              <span />
            )}
            <div className="flex w-full justify-end gap-2 sm:w-auto">
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

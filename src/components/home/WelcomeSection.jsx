import { useState, useEffect, useCallback, useRef } from "react";

import { motion } from "framer-motion";
import {
  Heart,
  Pencil,
  Plus,
  Star,
  Trash2,
  ImageIcon,
  FileText,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";
import { toast } from "sonner";

import {
  DEFAULT_WELCOME_TAG,
  DEFAULT_WELCOME_TITLE,
  DEFAULT_WELCOME_SUBTITLE,
  DEFAULT_WELCOME_P1,
  DEFAULT_WELCOME_P2,
  DEFAULT_VERSE_TEXT,
  DEFAULT_VERSE_REF,
  DEFAULT_HISTORY_VALUE,
  DEFAULT_HISTORY_LABEL,
} from "@/lib/homeContentDefaults";

const ABOUT_KEY = "aboutValuesCards";

/** Degradé do bloco do versículo (sem imagem), mesma paleta dos cards de valores (135°) */
const VERSE_PANEL_GRADIENT =
  "linear-gradient(135deg, #be123c 0%, #881337 32%, #1d4ed8 62%, #047857 100%)";

const DEFAULT_CARDS = [
  {
    id: "amor",
    title: "Amor",
    desc: "Acolhemos cada pessoa com o amor de Cristo.",
    primary: true,
    bgType: "gradient",
    gradient: "linear-gradient(135deg, #be123c 0%, #881337 100%)",
    imageUrl: "",
  },
  {
    id: "palavra",
    title: "Palavra",
    desc: "Fundamentados nos ensinamentos bíblicos.",
    primary: false,
    bgType: "gradient",
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
    imageUrl: "",
  },
  {
    id: "comunidade",
    title: "Comunidade",
    desc: "Crescemos juntos na fé e na fraternidade.",
    primary: false,
    bgType: "gradient",
    gradient: "linear-gradient(135deg, #047857 0%, #064e3b 100%)",
    imageUrl: "",
  },
];

function loadCards() {
  const raw = getSiteConfig()[ABOUT_KEY];
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((c, i) => ({
      ...DEFAULT_CARDS[Math.min(i, DEFAULT_CARDS.length - 1)],
      ...c,
      id: c.id || DEFAULT_CARDS[i]?.id || `card-${i}`,
      bgType: c.bgType === "image" ? "image" : "gradient",
      gradient: c.gradient || DEFAULT_CARDS[i]?.gradient,
      imageUrl: c.imageUrl || "",
      primary: !!c.primary,
    }));
  }
  return DEFAULT_CARDS.map((c) => ({ ...c }));
}

function ensureOnePrimary(list) {
  if (!list.some((c) => c.primary) && list.length) {
    return list.map((c, i) => ({ ...c, primary: i === 0 }));
  }
  const idx = list.findIndex((c) => c.primary);
  return list.map((c, i) => ({ ...c, primary: i === idx }));
}

function loadHomeCopyFromConfig() {
  const cfg = getSiteConfig();
  return {
    welcomeTag: cfg.welcomeTag ?? DEFAULT_WELCOME_TAG,
    welcomeTitle: cfg.welcomeTitle ?? DEFAULT_WELCOME_TITLE,
    welcomeSubtitle: cfg.welcomeSubtitle ?? DEFAULT_WELCOME_SUBTITLE,
    welcomeP1: cfg.welcomeParagraph1 ?? DEFAULT_WELCOME_P1,
    welcomeP2: cfg.welcomeParagraph2 ?? DEFAULT_WELCOME_P2,
    verseText: cfg.verseText ?? DEFAULT_VERSE_TEXT,
    verseRef: cfg.verseRef ?? DEFAULT_VERSE_REF,
    verseImageUrl: cfg.verseImageUrl ?? "",
    historyYearsValue: cfg.historyYearsValue ?? DEFAULT_HISTORY_VALUE,
    historyYearsLabel: cfg.historyYearsLabel ?? DEFAULT_HISTORY_LABEL,
  };
}

export default function WelcomeSection() {
  const [bgImage, setBgImage] = useState("");
  const user = useSyncedAuthUser();
  const canEditHome = canMenuAction(user, MENU.HOME, "edit");
  const [welcomeTag, setWelcomeTag] = useState(DEFAULT_WELCOME_TAG);
  const [welcomeTitle, setWelcomeTitle] = useState(DEFAULT_WELCOME_TITLE);
  const [welcomeSubtitle, setWelcomeSubtitle] = useState(
    DEFAULT_WELCOME_SUBTITLE,
  );
  const [welcomeP1, setWelcomeP1] = useState(DEFAULT_WELCOME_P1);
  const [welcomeP2, setWelcomeP2] = useState(DEFAULT_WELCOME_P2);
  const [verseText, setVerseText] = useState(DEFAULT_VERSE_TEXT);
  const [verseRef, setVerseRef] = useState(DEFAULT_VERSE_REF);
  const [verseImageUrl, setVerseImageUrl] = useState("");
  const [historyYearsValue, setHistoryYearsValue] = useState(
    DEFAULT_HISTORY_VALUE,
  );
  const [historyYearsLabel, setHistoryYearsLabel] = useState(
    DEFAULT_HISTORY_LABEL,
  );
  const [homeEditorOpen, setHomeEditorOpen] = useState(false);
  const [homeDraft, setHomeDraft] = useState(null);
  const [cards, setCards] = useState(loadCards);
  const [editCardOpen, setEditCardOpen] = useState(false);
  const [draftCard, setDraftCard] = useState(null);
  const [cardDeleteId, setCardDeleteId] = useState(null);
  const fileRef = useRef(null);
  const verseImgInputRef = useRef(null);

  const persistCards = useCallback((next) => {
    const normalized = ensureOnePrimary(next);
    try {
      setSiteConfig({ [ABOUT_KEY]: normalized });
    } catch (err) {
      toast.error(err?.message || "Não foi possível guardar os cartões.");
      return;
    }
    setCards(normalized);
  }, []);

  const applyHomeCopy = useCallback((copy) => {
    setWelcomeTag(copy.welcomeTag);
    setWelcomeTitle(copy.welcomeTitle);
    setWelcomeSubtitle(copy.welcomeSubtitle);
    setWelcomeP1(copy.welcomeP1);
    setWelcomeP2(copy.welcomeP2);
    setVerseText(copy.verseText);
    setVerseRef(copy.verseRef);
    setVerseImageUrl(copy.verseImageUrl || "");
    setHistoryYearsValue(copy.historyYearsValue);
    setHistoryYearsLabel(copy.historyYearsLabel);
  }, []);

  useEffect(() => {
    const cfg = getSiteConfig();
    if (cfg.welcomeBg) setBgImage(cfg.welcomeBg);
    applyHomeCopy(loadHomeCopyFromConfig());
    setCards(loadCards());
  }, [applyHomeCopy]);

  useEffect(() => {
    const sync = () => {
      setCards(loadCards());
      applyHomeCopy(loadHomeCopyFromConfig());
      const c = getSiteConfig();
      if (c.welcomeBg) setBgImage(c.welcomeBg);
    };
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, [applyHomeCopy]);

  const openHomeEditor = () => {
    setHomeDraft(loadHomeCopyFromConfig());
    setHomeEditorOpen(true);
  };

  const saveHomeEditor = () => {
    if (!homeDraft) return;
    const next = {
      welcomeTag: homeDraft.welcomeTag.trim() || DEFAULT_WELCOME_TAG,
      welcomeTitle: homeDraft.welcomeTitle.trim() || DEFAULT_WELCOME_TITLE,
      welcomeSubtitle:
        homeDraft.welcomeSubtitle.trim() || DEFAULT_WELCOME_SUBTITLE,
      welcomeParagraph1: homeDraft.welcomeP1.trim() || DEFAULT_WELCOME_P1,
      welcomeParagraph2: homeDraft.welcomeP2.trim() || DEFAULT_WELCOME_P2,
      verseText: homeDraft.verseText.trim() || DEFAULT_VERSE_TEXT,
      verseRef: homeDraft.verseRef.trim() || DEFAULT_VERSE_REF,
      verseImageUrl: homeDraft.verseImageUrl?.trim() || "",
      historyYearsValue:
        homeDraft.historyYearsValue.trim() || DEFAULT_HISTORY_VALUE,
      historyYearsLabel:
        homeDraft.historyYearsLabel.trim() || DEFAULT_HISTORY_LABEL,
    };
    try {
      setSiteConfig(next);
    } catch (err) {
      toast.error(err?.message || "Não foi possível guardar.");
      return;
    }
    applyHomeCopy({
      welcomeTag: next.welcomeTag,
      welcomeTitle: next.welcomeTitle,
      welcomeSubtitle: next.welcomeSubtitle,
      welcomeP1: next.welcomeParagraph1,
      welcomeP2: next.welcomeParagraph2,
      verseText: next.verseText,
      verseRef: next.verseRef,
      verseImageUrl: next.verseImageUrl,
      historyYearsValue: next.historyYearsValue,
      historyYearsLabel: next.historyYearsLabel,
    });
    setHomeEditorOpen(false);
    setHomeDraft(null);
  };

  const openNewCard = () => {
    setDraftCard({
      id: `card-${Date.now()}`,
      title: "Novo valor",
      desc: "Descrição breve.",
      primary: false,
      bgType: "gradient",
      gradient: "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
      imageUrl: "",
    });
    setEditCardOpen(true);
  };

  const openEditCard = (c) => {
    setDraftCard({ ...c });
    setEditCardOpen(true);
  };

  const saveCard = () => {
    if (!draftCard?.id) return;
    let next = cards.some((c) => c.id === draftCard.id)
      ? cards.map((c) => (c.id === draftCard.id ? { ...draftCard } : c))
      : [...cards, { ...draftCard }];
    if (draftCard.primary) {
      next = next.map((c) => ({
        ...c,
        primary: c.id === draftCard.id,
      }));
    }
    persistCards(next);
    setEditCardOpen(false);
    setDraftCard(null);
  };

  const executeRemoveCard = (id) => {
    const next = cards.filter((c) => c.id !== id);
    persistCards(next.length ? next : DEFAULT_CARDS.map((c) => ({ ...c })));
  };

  const orderedCards = [...cards].sort((a, b) =>
    a.primary === b.primary ? 0 : a.primary ? -1 : 1,
  );

  return (
    <section className="py-24 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div className="max-w-2xl">
            <span className="text-accent font-semibold text-sm tracking-[0.12em] uppercase">
              {welcomeTag}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-3 leading-tight">
              {welcomeTitle}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {welcomeSubtitle}
            </p>
          </div>
          {canEditHome && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openHomeEditor}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Editar textos
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={openNewCard}>
                <Plus className="w-4 h-4 mr-2" />
                Novo card
              </Button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-foreground/85 text-base sm:text-[17px] leading-[1.75] mb-6 max-w-prose whitespace-pre-wrap">
              {welcomeP1}
            </p>
            <p className="text-foreground/85 text-base sm:text-[17px] leading-[1.75] mb-10 max-w-prose whitespace-pre-wrap">
              {welcomeP2}
            </p>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {orderedCards.map((card, idx) => {
                const isImageBg = card.bgType === "image" && card.imageUrl;
                return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06, duration: 0.45 }}
                  className={`relative rounded-2xl border border-white/10 overflow-hidden flex flex-col p-5 text-white shadow-lg ${
                    isImageBg
                      ? "min-h-[200px] justify-end"
                      : "min-h-0 h-auto justify-start"
                  } ${
                    card.primary ? "sm:col-span-2 xl:col-span-3 ring-2 ring-accent/60" : ""
                  }`}
                  style={
                    isImageBg
                      ? undefined
                      : { background: card.gradient }
                  }
                >
                  {isImageBg ? (
                    <>
                      <img
                        src={card.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                    </>
                  ) : null}
                  <div className="relative z-10 w-full min-w-0">
                    {card.primary && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mb-2">
                        <Star className="w-3 h-3 fill-current" /> Principal
                      </span>
                    )}
                    <h4 className="font-display text-xl font-semibold">{card.title}</h4>
                    <p className="text-sm text-white/85 mt-1 leading-snug">{card.desc}</p>
                  </div>
                  {canEditHome && (
                    <div className="absolute top-2 right-2 flex gap-1 z-20">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 shrink-0 bg-white/95 text-zinc-900 shadow-md ring-1 ring-black/10 hover:bg-white dark:bg-white/95 dark:text-zinc-900 dark:hover:bg-white"
                        onClick={() => openEditCard(card)}
                        title="Editar card"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 shrink-0 bg-white/95 text-red-600 shadow-md ring-1 ring-black/10 hover:bg-white hover:text-red-700 dark:bg-white/95 dark:text-red-600 dark:hover:bg-white"
                        onClick={() => setCardDeleteId(card.id)}
                        title="Remover card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative z-0 flex min-h-[min(400px,75vh)] w-full flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl lg:min-h-[500px]">
              {verseImageUrl ? (
                <>
                  <img
                    src={verseImageUrl}
                    alt=""
                    className="absolute inset-0 z-0 h-full w-full object-cover object-center"
                    loading="eager"
                    decoding="async"
                  />
                  <div
                    className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/35 to-transparent"
                    aria-hidden
                  />
                  <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-5 p-8 sm:gap-6 sm:p-10">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-white/10 backdrop-blur-sm">
                      <Heart className="h-10 w-10 text-white drop-shadow" />
                    </div>
                    <div className="flex max-w-xl flex-col items-center gap-3 px-1 text-center">
                      <p className="font-display text-xl font-semibold leading-snug text-white sm:text-2xl [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
                        {verseText}
                      </p>
                      <p className="text-sm text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                        {verseRef}
                      </p>
                    </div>
                    {canEditHome && (
                      <button
                        type="button"
                        onClick={openHomeEditor}
                        className="absolute right-3 top-3 z-20 rounded-lg bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                        title="Editar versículo, imagem e textos"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {bgImage ? (
                    <>
                      <div
                        className="absolute inset-0 z-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${bgImage})` }}
                      />
                      <div
                        className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/35 to-transparent"
                        aria-hidden
                      />
                    </>
                  ) : (
                    <div
                      className="absolute inset-0 z-0"
                      style={{ background: VERSE_PANEL_GRADIENT }}
                      aria-hidden
                    />
                  )}

                  <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-5 p-8 sm:gap-6 sm:p-10">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-white/10 backdrop-blur-sm">
                      <Heart className="h-10 w-10 text-white drop-shadow" />
                    </div>

                    <div className="flex max-w-xl flex-col items-center gap-3 px-1 text-center">
                      <p className="font-display text-xl font-semibold leading-snug text-white sm:text-2xl [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
                        {verseText}
                      </p>
                      <p className="text-sm text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                        {verseRef}
                      </p>
                    </div>

                    {canEditHome && (
                      <button
                        type="button"
                        onClick={openHomeEditor}
                        className="absolute right-3 top-3 z-20 rounded-lg bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                        title="Editar versículo, imagem e textos"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="absolute -bottom-6 -left-6 z-20 hidden max-w-[12rem] rounded-2xl border border-white/20 bg-accent/95 p-6 text-accent-foreground shadow-xl backdrop-blur-sm lg:block">
              <p className="font-display text-3xl font-bold leading-tight">
                {historyYearsValue}
              </p>
              <p className="text-sm font-medium mt-1">{historyYearsLabel}</p>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog
        open={homeEditorOpen}
        onOpenChange={(o) => {
          setHomeEditorOpen(o);
          if (!o) setHomeDraft(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Textos da secção Bem-vindo</DialogTitle>
          </DialogHeader>
          {homeDraft && (
            <div className="space-y-5 py-2">
              <p className="text-sm text-muted-foreground">
                Estes textos aparecem na coluna da esquerda, no bloco do
                versículo e no selo de história. A imagem do versículo é opcional.
              </p>
              <div className="space-y-2">
                <Label htmlFor="wd-tag">Etiqueta (ex.: Sobre nós)</Label>
                <Input
                  id="wd-tag"
                  value={homeDraft.welcomeTag}
                  onChange={(e) =>
                    setHomeDraft((d) => ({ ...d, welcomeTag: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wd-title">Título principal</Label>
                <Input
                  id="wd-title"
                  value={homeDraft.welcomeTitle}
                  onChange={(e) =>
                    setHomeDraft((d) => ({ ...d, welcomeTitle: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wd-sub">Subtítulo</Label>
                <Input
                  id="wd-sub"
                  value={homeDraft.welcomeSubtitle}
                  onChange={(e) =>
                    setHomeDraft((d) => ({
                      ...d,
                      welcomeSubtitle: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wd-p1">Primeiro parágrafo</Label>
                <Textarea
                  id="wd-p1"
                  rows={4}
                  value={homeDraft.welcomeP1}
                  onChange={(e) =>
                    setHomeDraft((d) => ({ ...d, welcomeP1: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wd-p2">Segundo parágrafo</Label>
                <Textarea
                  id="wd-p2"
                  rows={4}
                  value={homeDraft.welcomeP2}
                  onChange={(e) =>
                    setHomeDraft((d) => ({ ...d, welcomeP2: e.target.value }))
                  }
                />
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <Label>Versículo — imagem (opcional)</Label>
                <input
                  ref={verseImgInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    void (async () => {
                      try {
                        const url = await imageFileToStorableUrl(f);
                        if (url) {
                          setHomeDraft((d) =>
                            d ? { ...d, verseImageUrl: url } : d,
                          );
                        }
                      } catch (err) {
                        console.warn(err);
                      }
                    })();
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => verseImgInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Escolher imagem
                  </Button>
                  {homeDraft.verseImageUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setHomeDraft((d) =>
                          d ? { ...d, verseImageUrl: "" } : d,
                        )
                      }
                    >
                      Remover imagem
                    </Button>
                  ) : null}
                </div>
                {homeDraft.verseImageUrl ? (
                  <div className="rounded-lg overflow-hidden border max-h-40">
                    <img
                      src={homeDraft.verseImageUrl}
                      alt=""
                      className="w-full h-full object-cover max-h-40"
                    />
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="wd-vtext">Texto do versículo</Label>
                <Textarea
                  id="wd-vtext"
                  rows={3}
                  value={homeDraft.verseText}
                  onChange={(e) =>
                    setHomeDraft((d) => ({ ...d, verseText: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wd-vref">Referência bíblica</Label>
                <Input
                  id="wd-vref"
                  value={homeDraft.verseRef}
                  onChange={(e) =>
                    setHomeDraft((d) => ({ ...d, verseRef: e.target.value }))
                  }
                  placeholder="— João 3:16"
                />
              </div>
              <div className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="wd-hist-v">Anos (destaque)</Label>
                  <Input
                    id="wd-hist-v"
                    value={homeDraft.historyYearsValue}
                    onChange={(e) =>
                      setHomeDraft((d) => ({
                        ...d,
                        historyYearsValue: e.target.value,
                      }))
                    }
                    placeholder="3+"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wd-hist-l">Legenda</Label>
                  <Input
                    id="wd-hist-l"
                    value={homeDraft.historyYearsLabel}
                    onChange={(e) =>
                      setHomeDraft((d) => ({
                        ...d,
                        historyYearsLabel: e.target.value,
                      }))
                    }
                    placeholder="Anos de história"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setHomeEditorOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={saveHomeEditor}
              disabled={!homeDraft}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editCardOpen} onOpenChange={setEditCardOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {cards.some((c) => c.id === draftCard?.id)
                ? "Editar card"
                : "Novo card"}
            </DialogTitle>
          </DialogHeader>
          {draftCard && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={draftCard.title}
                  onChange={(e) =>
                    setDraftCard((d) => ({ ...d, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={draftCard.desc}
                  onChange={(e) =>
                    setDraftCard((d) => ({ ...d, desc: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fundo</Label>
                <Select
                  value={draftCard.bgType}
                  onValueChange={(v) =>
                    setDraftCard((d) => ({
                      ...d,
                      bgType: v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gradient">Degradê (CSS)</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {draftCard.bgType === "gradient" ? (
                <div className="space-y-2">
                  <Label>CSS do degradê</Label>
                  <Textarea
                    rows={2}
                    className="font-mono text-xs"
                    value={draftCard.gradient}
                    onChange={(e) =>
                      setDraftCard((d) => ({ ...d, gradient: e.target.value }))
                    }
                    placeholder="linear-gradient(135deg, #hex 0%, #hex 100%)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex.: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Imagem de fundo</Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void (async () => {
                          try {
                            const u = await imageFileToStorableUrl(f);
                            setDraftCard((d) => ({ ...d, imageUrl: u }));
                          } catch (err) {
                            console.warn(err);
                          }
                        })();
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Escolher imagem
                    </Button>
                    {draftCard.imageUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDraftCard((d) => ({ ...d, imageUrl: "" }))
                        }
                      >
                        Remover imagem
                      </Button>
                    ) : null}
                  </div>
                  {draftCard.imageUrl ? (
                    <div className="rounded-lg overflow-hidden border aspect-video max-h-36">
                      <img
                        src={draftCard.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Card principal</p>
                  <p className="text-xs text-muted-foreground">
                    Destaque em largura completa (em ecrãs maiores)
                  </p>
                </div>
                <Switch
                  checked={!!draftCard.primary}
                  onCheckedChange={(v) =>
                    setDraftCard((d) => (d ? { ...d, primary: v } : d))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCardOpen(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={saveCard}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cardDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setCardDeleteId(null);
        }}
        title="Remover este card?"
        description="O cartão será removido da secção «Sobre nós». Pode voltar a adicionar um novo depois."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (cardDeleteId != null) executeRemoveCard(cardDeleteId);
        }}
      />
    </section>
  );
}

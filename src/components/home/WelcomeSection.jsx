import { useState, useEffect, useCallback } from "react";

import { motion } from "framer-motion";
import { Heart, Pencil } from "lucide-react";

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
import HomeSectionBackdrop from "@/components/home/HomeSectionBackdrop";
import SafeImg from "@/components/shared/SafeImg";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import { MENU } from "@/lib/auth";
import useCanEdit from "@/lib/useCanEdit";
import { toast } from "sonner";
import {
  imageScrimFlat,
  imageScrimBottom,
} from "@/lib/imageScrimClasses";
import { homeSectionSolidContent } from "@/lib/homeSectionSolidClasses";
import usePrefersReducedMotion from "@/lib/usePrefersReducedMotion";

import {
  DEFAULT_WELCOME_TAG,
  DEFAULT_WELCOME_TITLE,
  DEFAULT_WELCOME_SUBTITLE,
  DEFAULT_WELCOME_P1,
  DEFAULT_WELCOME_P2,
  DEFAULT_VERSE_TEXT,
  DEFAULT_VERSE_REF,
  DEFAULT_VERSE_IMAGE_URL,
  DEFAULT_HISTORY_VALUE,
  DEFAULT_HISTORY_LABEL,
  SECTION_BG_KEYS,
} from "@/lib/homeContentDefaults";
import { cn } from "@/lib/utils";

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
    historyYearsValue: cfg.historyYearsValue ?? DEFAULT_HISTORY_VALUE,
    historyYearsLabel: cfg.historyYearsLabel ?? DEFAULT_HISTORY_LABEL,
  };
}

export default function WelcomeSection() {
  const [sectionBgUrl, setSectionBgUrl] = useState("");
  const canEditHome = useCanEdit(MENU.HOME);
  const reduceMotion = usePrefersReducedMotion();
  const [welcomeTag, setWelcomeTag] = useState(DEFAULT_WELCOME_TAG);
  const [welcomeTitle, setWelcomeTitle] = useState(DEFAULT_WELCOME_TITLE);
  const [welcomeSubtitle, setWelcomeSubtitle] = useState(
    DEFAULT_WELCOME_SUBTITLE,
  );
  const [welcomeP1, setWelcomeP1] = useState(DEFAULT_WELCOME_P1);
  const [welcomeP2, setWelcomeP2] = useState(DEFAULT_WELCOME_P2);
  const [verseText, setVerseText] = useState(DEFAULT_VERSE_TEXT);
  const [verseRef, setVerseRef] = useState(DEFAULT_VERSE_REF);
  const [historyYearsValue, setHistoryYearsValue] = useState(
    DEFAULT_HISTORY_VALUE,
  );
  const [historyYearsLabel, setHistoryYearsLabel] = useState(
    DEFAULT_HISTORY_LABEL,
  );
  const [homeEditorOpen, setHomeEditorOpen] = useState(false);
  const [homeDraft, setHomeDraft] = useState(null);

  const applyHomeCopy = useCallback((copy) => {
    setWelcomeTag(copy.welcomeTag);
    setWelcomeTitle(copy.welcomeTitle);
    setWelcomeSubtitle(copy.welcomeSubtitle);
    setWelcomeP1(copy.welcomeP1);
    setWelcomeP2(copy.welcomeP2);
    setVerseText(copy.verseText);
    setVerseRef(copy.verseRef);
    setHistoryYearsValue(copy.historyYearsValue);
    setHistoryYearsLabel(copy.historyYearsLabel);
  }, []);

  useEffect(() => {
    const cfg = getSiteConfig();
    setSectionBgUrl(String(cfg[SECTION_BG_KEYS.welcome] || "").trim());
    applyHomeCopy(loadHomeCopyFromConfig());
  }, [applyHomeCopy]);

  useEffect(() => {
    const sync = () => {
      applyHomeCopy(loadHomeCopyFromConfig());
      const c = getSiteConfig();
      setSectionBgUrl(String(c[SECTION_BG_KEYS.welcome] || "").trim());
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
      historyYearsValue:
        homeDraft.historyYearsValue.trim() || DEFAULT_HISTORY_VALUE,
      historyYearsLabel:
        homeDraft.historyYearsLabel.trim() || DEFAULT_HISTORY_LABEL,
    };
    try {
      if (canEditHome) {
        void (async () => {
          try {
            await savePublicSiteConfigAdmin(next);
            await refreshPublicSiteConfig();
          } catch (e) {
            setSiteConfig(next);
          }
          toast.success("Textos da home salvos com sucesso.");
        })();
      } else {
        setSiteConfig(next);
        toast.success("Textos da home salvos com sucesso.");
      }
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
      historyYearsValue: next.historyYearsValue,
      historyYearsLabel: next.historyYearsLabel,
    });
    setHomeEditorOpen(false);
    setHomeDraft(null);
  };

  const solidHeader = !sectionBgUrl;

  return (
    <>
      <HomeSectionBackdrop
        imageUrl={sectionBgUrl}
        className="py-16 sm:py-20 lg:py-28"
      >
        <div className="container-page">
        <div className="grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-stretch lg:gap-x-12 lg:gap-y-8 xl:gap-x-16">
          <div
            className={cn(
              "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 min-w-0 lg:col-start-1 lg:row-start-1",
              solidHeader && homeSectionSolidContent,
            )}
          >
            <div className="max-w-2xl">
              <span className="text-accent font-semibold text-sm tracking-[0.12em] uppercase">
                {welcomeTag}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mt-3 leading-tight tracking-tight">
                {welcomeTitle}
              </h2>
              <p className="prose-lead mt-3">{welcomeSubtitle}</p>
            </div>
            {canEditHome && (
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openHomeEditor}
                  className="gap-2"
                  aria-label="Editar — Textos (Bem-vindo)"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Editar — Textos (Bem-vindo)</span>
                </Button>
              </div>
            )}
          </div>

          <motion.div
            initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.6 }}
            className={cn(
              "min-w-0 flex flex-col lg:col-start-1 lg:row-start-2 lg:h-full lg:justify-start",
              solidHeader && homeSectionSolidContent,
            )}
          >
            <div className="max-w-2xl space-y-6 lg:pr-1">
              <p className="text-foreground text-base sm:text-[17px] leading-[1.75] whitespace-pre-wrap">
                {welcomeP1}
              </p>
              <p className="text-foreground text-base sm:text-[17px] leading-[1.75] whitespace-pre-wrap">
                {welcomeP2}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.6 }}
            className="relative flex min-h-0 w-full min-w-0 flex-col lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:h-full"
          >
            <div className="relative z-0 flex min-h-[min(360px,58vh)] w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-muted/10 shadow-card lg:min-h-0">
              <SafeImg
                src={DEFAULT_VERSE_IMAGE_URL}
                alt=""
                className="absolute inset-0 z-0 h-full w-full object-cover object-center"
                loading="eager"
                decoding="async"
              />
              <div className={imageScrimFlat} aria-hidden />
              <div className={imageScrimBottom} aria-hidden />
              <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-6 px-8 pb-10 pt-10 sm:px-10 sm:pb-12 sm:pt-12">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-white/10 backdrop-blur-sm sm:h-20 sm:w-20">
                  <Heart className="h-8 w-8 text-white drop-shadow sm:h-10 sm:w-10" />
                </div>
                <div className="flex w-full max-w-md flex-col items-center gap-3 text-center sm:max-w-lg">
                  <p className="font-display text-lg font-semibold leading-snug text-white sm:text-xl md:text-2xl [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
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
                    className="absolute right-3 top-3 z-30 rounded-lg bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                    title="Editar versículo e textos"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      </HomeSectionBackdrop>

      <Dialog
        open={homeEditorOpen}
        onOpenChange={(o) => {
          setHomeEditorOpen(o);
          if (!o) setHomeDraft(null);
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,52rem)] w-[calc(100vw-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 text-left sm:px-6">
            <DialogTitle>Textos da secção Bem-vindo</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Parágrafos à esquerda; cartão do versículo à direita. O selo de
              história aparece no hero do topo.
            </p>
          </DialogHeader>
          {homeDraft && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              <div className="space-y-5">
                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cabeçalho
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="wd-tag">Etiqueta (ex.: Sobre nós)</Label>
                    <Input
                      id="wd-tag"
                      value={homeDraft.welcomeTag}
                      onChange={(e) =>
                        setHomeDraft((d) => ({
                          ...d,
                          welcomeTag: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wd-title">Título principal</Label>
                    <Input
                      id="wd-title"
                      value={homeDraft.welcomeTitle}
                      onChange={(e) =>
                        setHomeDraft((d) => ({
                          ...d,
                          welcomeTitle: e.target.value,
                        }))
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
                </div>

                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Parágrafos
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="wd-p1">Primeiro parágrafo</Label>
                    <Textarea
                      id="wd-p1"
                      rows={4}
                      value={homeDraft.welcomeP1}
                      onChange={(e) =>
                        setHomeDraft((d) => ({
                          ...d,
                          welcomeP1: e.target.value,
                        }))
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
                        setHomeDraft((d) => ({
                          ...d,
                          welcomeP2: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Versículo
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="wd-vtext">Texto do versículo</Label>
                    <Textarea
                      id="wd-vtext"
                      rows={3}
                      value={homeDraft.verseText}
                      onChange={(e) =>
                        setHomeDraft((d) => ({
                          ...d,
                          verseText: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wd-vref">Referência bíblica</Label>
                    <Input
                      id="wd-vref"
                      value={homeDraft.verseRef}
                      onChange={(e) =>
                        setHomeDraft((d) => ({
                          ...d,
                          verseRef: e.target.value,
                        }))
                      }
                      placeholder="— João 3:16"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Selo de história
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background px-5 py-4 sm:px-6 sm:gap-0">
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
    </>
  );
}

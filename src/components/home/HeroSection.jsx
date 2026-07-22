import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import BackgroundSlideshow from "@/components/shared/BackgroundSlideshow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";

import { useHeroBackground } from "@/lib/useHeroBackground";
import usePrefersReducedMotion from "@/lib/usePrefersReducedMotion";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import { IMAGE_UPLOAD_RECOMMENDATION } from "@/lib/uploadImage";
import { MENU } from "@/lib/auth";
import useCanEdit from "@/lib/useCanEdit";
import {
  DEFAULT_HERO_EYEBROW,
  DEFAULT_HERO_TITLE,
  resolveHeroCopy,
} from "@/lib/homeContentDefaults";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatSeconds(ms) {
  const s = Math.round((ms / 1000) * 10) / 10;
  return Number.isInteger(s) ? String(s) : s.toFixed(1);
}

function applyHeroCopyFromConfig() {
  const c = getSiteConfig();
  return resolveHeroCopy(c.heroEyebrow, c.heroTitle);
}

export default function HeroSection() {
  const {
    slides,
    appendFromFiles,
    removeAt,
    clearAll,
    rotateIntervalMs,
    transitionMs,
    transitionMode,
    updateHeroSettings,
  } = useHeroBackground();
  const [panelOpen, setPanelOpen] = useState(false);
  const multiRef = useRef(null);
  const [intervalDraft, setIntervalDraft] = useState("");
  const [transitionDraft, setTransitionDraft] = useState("");
  const canEditHome = useCanEdit(MENU.HOME);
  const reduceMotion = usePrefersReducedMotion();
  const initialCopy = applyHeroCopyFromConfig();
  const [heroEyebrow, setHeroEyebrow] = useState(initialCopy.eyebrow);
  const [heroTitle, setHeroTitle] = useState(initialCopy.title);
  const [heroTextOpen, setHeroTextOpen] = useState(false);
  const [draftEyebrow, setDraftEyebrow] = useState("");
  const [draftHeroTitle, setDraftHeroTitle] = useState("");
  const didCountRef = useRef(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);

  useEffect(() => {
    if (didCountRef.current) return;
    didCountRef.current = true;
    (async () => {
      try {
        const r = await fetch("/api/metrics/home-views", {
          method: "POST",
          credentials: "include",
        });
        if (!r.ok) return;
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const copy = applyHeroCopyFromConfig();
    setHeroEyebrow(copy.eyebrow);
    setHeroTitle(copy.title);
  }, []);

  useEffect(() => {
    const onCfg = () => {
      const copy = applyHeroCopyFromConfig();
      setHeroEyebrow(copy.eyebrow);
      setHeroTitle(copy.title);
    };
    window.addEventListener("icer-site-config", onCfg);
    return () => window.removeEventListener("icer-site-config", onCfg);
  }, []);

  useEffect(() => {
    if (panelOpen) {
      setIntervalDraft(formatSeconds(rotateIntervalMs));
      setTransitionDraft(formatSeconds(transitionMs));
    }
  }, [panelOpen, rotateIntervalMs, transitionMs]);

  const commitIntervalDraft = () => {
    const v = parseFloat(String(intervalDraft).replace(",", "."));
    if (Number.isFinite(v) && v > 0) {
      updateHeroSettings({ homeHeroRotateIntervalMs: Math.round(v * 1000) });
    } else {
      setIntervalDraft(formatSeconds(rotateIntervalMs));
    }
  };

  const commitTransitionDraft = () => {
    const v = parseFloat(String(transitionDraft).replace(",", "."));
    if (Number.isFinite(v) && v > 0) {
      updateHeroSettings({ homeHeroTransitionMs: Math.round(v * 1000) });
    } else {
      setTransitionDraft(formatSeconds(transitionMs));
    }
  };

  const hasSlides = slides.length > 0;

  return (
    <section
      ref={heroRef}
      className="relative w-full max-w-full overflow-hidden"
    >
      <div className="hero-cinematic-wrap relative">
        {/* Radial glow atrás da imagem */}
        <div className="hero-cinematic-glow pointer-events-none absolute inset-0 z-[1]" aria-hidden />

        {/* Media — object-cover dentro da viewport, sem scale/overflow */}
        <div className="absolute inset-0 z-[2] overflow-hidden">
          {hasSlides ? (
            <div className="hero-cinematic-media">
              <BackgroundSlideshow
                urls={slides}
                rotateIntervalMs={rotateIntervalMs}
                transitionMs={transitionMs}
                transitionMode={transitionMode}
                fit="cover"
              />
            </div>
          ) : (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 120% 80% at 20% 30%, rgba(37,99,235,0.22) 0%, transparent 55%), radial-gradient(ellipse 90% 50% at 90% 80%, rgba(59,130,246,0.16) 0%, transparent 50%)",
              }}
              aria-hidden
            />
          )}
        </div>

        {/* Overlay cinematográfico */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[3]",
            hasSlides ? "hero-cinematic-scrim" : "bg-gradient-to-t from-background/50 via-transparent to-transparent",
          )}
          aria-hidden
        />

        {/* Conteúdo */}
        <div className="relative z-10 flex h-full min-h-0 w-full max-w-full flex-col items-center justify-end px-4 pb-8 pt-20 sm:px-8 sm:pb-14 sm:pt-28 lg:px-12 lg:pb-16">
          {canEditHome && (
            <div className="absolute top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-8 z-20 flex flex-wrap gap-2 justify-end max-sm:justify-start">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={
                  hasSlides
                    ? "border-white/50 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm gap-2"
                    : "gap-2 backdrop-blur-sm"
                }
                onClick={() => {
                  setDraftEyebrow(heroEyebrow);
                  setDraftHeroTitle(heroTitle);
                  setHeroTextOpen(true);
                }}
                title="Editar — Títulos do hero"
              >
                <Pencil className="w-4 h-4" />
                Títulos
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={
                  hasSlides
                    ? "border-white/50 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                    : "backdrop-blur-sm"
                }
                onClick={() => setPanelOpen(true)}
                title={`Editar — Fundo do hero. ${IMAGE_UPLOAD_RECOMMENDATION}`}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Fundo do hero
              </Button>
            </div>
          )}

          <motion.div
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
            style={{
              y: reduceMotion ? 0 : textY,
              opacity: reduceMotion ? 1 : textOpacity,
            }}
            className="mx-auto w-full min-w-0 max-w-4xl text-center"
          >
            {heroEyebrow ? (
              <p
                className={cn(
                  "eyebrow-premium mb-3 sm:mb-4",
                  hasSlides && "text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]",
                )}
              >
                {heroEyebrow}
              </p>
            ) : null}
            <h1
              className={cn(
                "heading-premium text-3xl sm:text-5xl lg:text-7xl leading-[1.05] break-words",
                hasSlides
                  ? "text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.55)]"
                  : "text-foreground",
              )}
            >
              {heroTitle}
            </h1>
          </motion.div>
        </div>
      </div>

      <Dialog open={heroTextOpen} onOpenChange={setHeroTextOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Textos do topo (hero)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="hero-eyebrow">Linha superior (ex.: Casa de Oração)</Label>
              <Input
                id="hero-eyebrow"
                value={draftEyebrow}
                onChange={(e) => setDraftEyebrow(e.target.value)}
                placeholder={DEFAULT_HERO_EYEBROW}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-title">Título principal</Label>
              <Input
                id="hero-title"
                value={draftHeroTitle}
                onChange={(e) => setDraftHeroTitle(e.target.value)}
                placeholder={DEFAULT_HERO_TITLE}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeroTextOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={() => {
                const e = draftEyebrow.trim();
                const t = draftHeroTitle.trim() || DEFAULT_HERO_TITLE;
                setHeroEyebrow(e);
                setHeroTitle(t);
                if (canEditHome) {
                  savePublicSiteConfigAdmin({ heroEyebrow: e, heroTitle: t })
                    .then(() => refreshPublicSiteConfig())
                    .then(() => toast.success("Textos do topo salvos com sucesso."))
                    .catch(() => {
                      setSiteConfig({ heroEyebrow: e, heroTitle: t });
                      toast.success("Textos do topo salvos com sucesso.");
                    });
                } else {
                  setSiteConfig({ heroEyebrow: e, heroTitle: t });
                  toast.success("Textos do topo salvos com sucesso.");
                }
                setHeroTextOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fundo do hero</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Imagens de fundo do topo da página. Com várias fotos, elas alternam
            conforme o intervalo e o tipo de transição abaixo. Uma só imagem
            fica fixa. Formatos: PNG, JPG, WebP.
          </p>

          <div className="space-y-4 border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-medium text-foreground uppercase tracking-wide">
              Transição do carrossel
            </p>
            <div className="space-y-2">
              <Label htmlFor="hero-interval">
                Intervalo entre imagens (segundos)
              </Label>
              <Input
                id="hero-interval"
                type="text"
                inputMode="decimal"
                className="h-9"
                value={intervalDraft}
                onChange={(e) => setIntervalDraft(e.target.value)}
                onBlur={commitIntervalDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitIntervalDraft();
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Tempo que cada foto fica visível antes da próxima (mín. ~1,5
                s; deve ser maior que a duração da transição).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-trans-dur">
                Duração da transição (segundos)
              </Label>
              <Input
                id="hero-trans-dur"
                type="text"
                inputMode="decimal"
                className="h-9"
                value={transitionDraft}
                onChange={(e) => setTransitionDraft(e.target.value)}
                onBlur={commitTransitionDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTransitionDraft();
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Quanto tempo leva o esmaecer ou o deslize entre duas imagens.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-trans-type">Tipo de transição</Label>
              <Select
                value={transitionMode}
                onValueChange={(v) =>
                  updateHeroSettings({ homeHeroTransitionMode: v })
                }
              >
                <SelectTrigger id="hero-trans-type" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Esmaecer</SelectItem>
                  <SelectItem value="slide">
                    Deslizar (direita → esquerda)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <input
            ref={multiRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void appendFromFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => multiRef.current?.click()}
          >
            <ImagePlus className="w-4 h-4 mr-2" />
            Adicionar imagens
          </Button>
          {slides.length > 0 && (
            <ul className="space-y-2 border rounded-lg p-2 max-h-48 overflow-y-auto">
              {slides.map((src, i) => (
                <li
                  key={`${i}-${src.slice(0, 40)}`}
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
                    onClick={() => removeAt(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={slides.length === 0}
              onClick={() => clearAll()}
            >
              Limpar todas
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setPanelOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

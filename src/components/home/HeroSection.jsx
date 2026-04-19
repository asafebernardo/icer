import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

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
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";
import {
  DEFAULT_HERO_EYEBROW,
  DEFAULT_HERO_TITLE,
} from "@/lib/homeContentDefaults";

function formatSeconds(ms) {
  const s = Math.round((ms / 1000) * 10) / 10;
  return Number.isInteger(s) ? String(s) : s.toFixed(1);
}

export default function HeroSection() {
  const {
    slides,
    isAdmin,
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
  const user = useSyncedAuthUser();
  const canEditHome = canMenuAction(user, MENU.HOME, "edit");
  const [heroEyebrow, setHeroEyebrow] = useState(DEFAULT_HERO_EYEBROW);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_HERO_TITLE);
  const [heroTextOpen, setHeroTextOpen] = useState(false);
  const [draftEyebrow, setDraftEyebrow] = useState("");
  const [draftHeroTitle, setDraftHeroTitle] = useState("");

  useEffect(() => {
    const c = getSiteConfig();
    if (c.heroEyebrow != null && c.heroEyebrow !== "") setHeroEyebrow(c.heroEyebrow);
    if (c.heroTitle != null && c.heroTitle !== "") setHeroTitle(c.heroTitle);
  }, []);

  useEffect(() => {
    const onCfg = () => {
      const c = getSiteConfig();
      if (c.heroEyebrow != null && c.heroEyebrow !== "") setHeroEyebrow(c.heroEyebrow);
      if (c.heroTitle != null && c.heroTitle !== "") setHeroTitle(c.heroTitle);
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

  return (
    <section className="relative min-h-[70vh] sm:min-h-[80vh] lg:min-h-[85vh] flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800" />

      <div className="absolute inset-0 overflow-hidden">
        {slides.length > 0 ? (
          <BackgroundSlideshow
            urls={slides}
            rotateIntervalMs={rotateIntervalMs}
            transitionMs={transitionMs}
            transitionMode={transitionMode}
          />
        ) : (
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, #181818 0%, transparent 50%), radial-gradient(circle at 80% 20%, #a1a1aa 0%, transparent 40%)",
            }}
          />
        )}
      </div>

      {/* Degradé pequeno na base, sobre as imagens — transição suave para a secção seguinte */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[22%] min-h-[90px] max-h-[180px] bg-gradient-to-t from-black/35 via-black/[0.08] to-transparent dark:from-zinc-950/55 dark:via-zinc-950/10"
        aria-hidden
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col flex-1 min-h-0 justify-end pb-10 sm:pb-14 lg:pb-16 pt-28 sm:pt-32">
        {(isAdmin || canEditHome) && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex flex-wrap gap-2 justify-end">
            {canEditHome && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/50 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm gap-2"
                onClick={() => {
                  setDraftEyebrow(heroEyebrow);
                  setDraftHeroTitle(heroTitle);
                  setHeroTextOpen(true);
                }}
              >
                <Pencil className="w-4 h-4" />
                Títulos
              </Button>
            )}
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/50 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                onClick={() => setPanelOpen(true)}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Fundos do hero
              </Button>
            )}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          className="max-w-3xl"
        >
          <p className="text-white text-sm sm:text-base font-semibold tracking-[0.18em] uppercase mb-3">
            {heroEyebrow}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
            {heroTitle}
          </h1>
        </motion.div>
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
                const e = draftEyebrow.trim() || DEFAULT_HERO_EYEBROW;
                const t = draftHeroTitle.trim() || DEFAULT_HERO_TITLE;
                setHeroEyebrow(e);
                setHeroTitle(t);
                setSiteConfig({ heroEyebrow: e, heroTitle: t });
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
            <DialogTitle>Fundos do hero</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Imagens de fundo na página inicial. Com várias fotos, elas alternam
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
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-8 w-8"
                    onClick={() => removeAt(i)}
                    aria-label={`Remover imagem ${i + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
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

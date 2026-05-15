import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, ImagePlus, Trash2 } from "lucide-react";
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

import BackgroundSlideshow from "@/components/shared/BackgroundSlideshow";
import HomeSectionBackdrop from "@/components/home/HomeSectionBackdrop";
import {
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import { imageFileToStorableUrl } from "@/lib/uploadImage";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { imageScrimFlat, imageScrimBottom } from "@/lib/imageScrimClasses";
import { homeSectionSolidContent } from "@/lib/homeSectionSolidClasses";
import {
  DEFAULT_CHANNEL_URL,
  DEFAULT_CHANNEL_SECTION_TAG,
  DEFAULT_CHANNEL_SECTION_TITLE,
  DEFAULT_CHANNEL_SECTION_SUBTITLE,
  SECTION_BG_KEYS,
} from "@/lib/homeContentDefaults";
import { readChannelSlides, readChannelSettings } from "@/lib/channelSectionBackground";

function formatSeconds(ms) {
  const s = Math.round((ms / 1000) * 10) / 10;
  return Number.isInteger(s) ? String(s) : s.toFixed(1);
}

function loadChannelFromConfig() {
  const c = getSiteConfig();
  const s = readChannelSettings();
  return {
    sectionTag: c.channelSectionTag ?? DEFAULT_CHANNEL_SECTION_TAG,
    sectionTitle: c.channelSectionTitle ?? DEFAULT_CHANNEL_SECTION_TITLE,
    sectionSubtitle:
      c.channelSectionSubtitle ?? DEFAULT_CHANNEL_SECTION_SUBTITLE,
    url: c.channelUrl ?? DEFAULT_CHANNEL_URL,
    slides: readChannelSlides(),
    rotateIntervalMs: s.rotateIntervalMs,
    transitionMs: s.transitionMs,
    transitionMode: s.transitionMode,
  };
}

export default function ChurchChannelSection() {
  const [sectionBgUrl, setSectionBgUrl] = useState("");
  const user = useSyncedAuthUser();
  const canEditHome = canMenuAction(user, MENU.HOME, "edit");
  const [sectionTag, setSectionTag] = useState(DEFAULT_CHANNEL_SECTION_TAG);
  const [sectionTitle, setSectionTitle] = useState(DEFAULT_CHANNEL_SECTION_TITLE);
  const [sectionSubtitle, setSectionSubtitle] = useState(
    DEFAULT_CHANNEL_SECTION_SUBTITLE,
  );
  const [url, setUrl] = useState(DEFAULT_CHANNEL_URL);
  const [slides, setSlides] = useState([]);
  const [rotateIntervalMs, setRotateIntervalMs] = useState(4000);
  const [transitionMs, setTransitionMs] = useState(700);
  const [transitionMode, setTransitionMode] = useState("fade");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const multiRef = useRef(null);

  const apply = useCallback((data) => {
    setSectionTag(data.sectionTag);
    setSectionTitle(data.sectionTitle);
    setSectionSubtitle(data.sectionSubtitle);
    setUrl(data.url);
    setSlides(data.slides || []);
    setRotateIntervalMs(data.rotateIntervalMs);
    setTransitionMs(data.transitionMs);
    setTransitionMode(data.transitionMode || "fade");
  }, []);

  useEffect(() => {
    setSectionBgUrl(
      String(getSiteConfig()[SECTION_BG_KEYS.channel] || "").trim(),
    );
    apply(loadChannelFromConfig());
  }, [apply]);

  useEffect(() => {
    const sync = () => {
      setSectionBgUrl(
        String(getSiteConfig()[SECTION_BG_KEYS.channel] || "").trim(),
      );
      apply(loadChannelFromConfig());
    };
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, [apply]);

  const openEditor = () => {
    const cur = loadChannelFromConfig();
    setDraft({
      sectionTag: cur.sectionTag,
      sectionTitle: cur.sectionTitle,
      sectionSubtitle: cur.sectionSubtitle,
      url: cur.url,
      slides: [...cur.slides],
      intervalDraft: formatSeconds(cur.rotateIntervalMs),
      transitionDraft: formatSeconds(cur.transitionMs),
      transitionMode: cur.transitionMode,
    });
    setEditorOpen(true);
  };

  const saveEditor = () => {
    if (!draft) return;
    const parseSec = (str, fallbackMs) => {
      const v = parseFloat(String(str).replace(",", "."));
      if (Number.isFinite(v) && v > 0) return Math.round(v * 1000);
      return fallbackMs;
    };
    const tMs = parseSec(draft.transitionDraft, transitionMs);
    let rMs = parseSec(draft.intervalDraft, rotateIntervalMs);
    if (rMs < tMs + 350) rMs = tMs + 350;

    try {
      const patch = {
        channelSectionTag:
          draft.sectionTag?.trim() || DEFAULT_CHANNEL_SECTION_TAG,
        channelSectionTitle:
          draft.sectionTitle?.trim() || DEFAULT_CHANNEL_SECTION_TITLE,
        channelSectionSubtitle:
          draft.sectionSubtitle?.trim() || DEFAULT_CHANNEL_SECTION_SUBTITLE,
        channelUrl: draft.url.trim() || DEFAULT_CHANNEL_URL,
        channelSectionSlides: (draft.slides || []).filter(Boolean),
        channelSectionRotateIntervalMs: rMs,
        channelSectionTransitionMs: tMs,
        channelSectionTransitionMode:
          draft.transitionMode === "slide" ? "slide" : "fade",
      };
      if (canEditHome) {
        savePublicSiteConfigAdmin(patch)
          .then(() => refreshPublicSiteConfig())
          .catch(() => setSiteConfig(patch));
      } else {
        setSiteConfig(patch);
      }
    } catch (e) {
      toast.error(e?.message || "Não foi possível guardar.");
      return;
    }

    apply({
      sectionTag:
        draft.sectionTag?.trim() || DEFAULT_CHANNEL_SECTION_TAG,
      sectionTitle:
        draft.sectionTitle?.trim() || DEFAULT_CHANNEL_SECTION_TITLE,
      sectionSubtitle:
        draft.sectionSubtitle?.trim() || DEFAULT_CHANNEL_SECTION_SUBTITLE,
      url: draft.url.trim() || DEFAULT_CHANNEL_URL,
      slides: draft.slides.filter(Boolean),
      rotateIntervalMs: rMs,
      transitionMs: tMs,
      transitionMode: draft.transitionMode === "slide" ? "slide" : "fade",
    });
    setEditorOpen(false);
    setDraft(null);
  };

  const appendFromFiles = async (fileList) => {
    if (!fileList?.length || !draft) return;
    const files = Array.from(fileList);
    try {
      const urls = await Promise.all(
        files.map((f) => imageFileToStorableUrl(f)),
      );
      setDraft((d) =>
        d ? { ...d, slides: [...(d.slides || []).filter(Boolean), ...urls] } : d,
      );
    } catch (err) {
      toast.error(err?.message || "Não foi possível carregar as imagens.");
    }
  };

  const removeSlideAt = (index) => {
    setDraft((d) => {
      if (!d) return d;
      const next = (d.slides || []).filter((_, i) => i !== index);
      return { ...d, slides: next };
    });
  };

  const clearSlides = () => {
    setDraft((d) => (d ? { ...d, slides: [] } : d));
  };

  const href =
    url && /^https?:\/\//i.test(url.trim())
      ? url.trim()
      : url.trim()
        ? `https://${url.trim()}`
        : DEFAULT_CHANNEL_URL;

  const hasSlides = slides.length > 0;
  const solidHeader = !sectionBgUrl;

  return (
    <>
      <HomeSectionBackdrop
        imageUrl={sectionBgUrl}
        className="py-16 sm:py-20 lg:py-28"
      >
        <div className="container-page min-w-0">
          <div
            className={cn(
              "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12",
              solidHeader && homeSectionSolidContent,
            )}
          >
            <div className="max-w-2xl">
              <span className="text-accent font-semibold text-sm tracking-[0.12em] uppercase">
                {sectionTag}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mt-3 leading-tight tracking-tight">
                {sectionTitle}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {sectionSubtitle}
              </p>
            </div>
            {canEditHome && (
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={openEditor}
                >
                  <Pencil className="w-4 h-4" />
                  Editar canal
                </Button>
              </div>
            )}
          </div>

          <div className="relative min-h-[min(48vh,480px)] w-full overflow-hidden rounded-lg border border-border/80 bg-muted/20 shadow-card">
            {hasSlides ? (
              <>
                <div className="absolute inset-0 z-0">
                  <BackgroundSlideshow
                    urls={slides}
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
                  className="absolute inset-0 z-0 bg-gradient-to-br from-card to-muted/80"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[55%] min-h-[140px] bg-gradient-to-t from-black/22 via-black/8 to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-0 z-[2] flex items-center justify-center">
                  <p className="max-w-md px-4 text-center text-sm text-muted-foreground">
                    {canEditHome
                      ? "Adicione imagens em «Editar canal» para o fundo deste bloco."
                      : "Canal da igreja."}
                  </p>
                </div>
              </>
            )}

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Aceder ao canal no YouTube. Abre num novo separador."
            />
          </div>
        </div>
      </HomeSectionBackdrop>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Secção do canal</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Textos do cabeçalho (etiqueta, título e subtítulo) seguem o mesmo
                padrão da secção «Sobre».
              </p>
              <div className="space-y-2">
                <Label htmlFor="ch-tag">Etiqueta (ex.: Online)</Label>
                <Input
                  id="ch-tag"
                  value={draft.sectionTag}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, sectionTag: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ch-title">Título</Label>
                <Input
                  id="ch-title"
                  value={draft.sectionTitle}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, sectionTitle: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ch-sub">Subtítulo</Label>
                <Input
                  id="ch-sub"
                  value={draft.sectionSubtitle}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, sectionSubtitle: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ch-url">URL do canal (YouTube)</Label>
                <Input
                  id="ch-url"
                  type="url"
                  placeholder="https://www.youtube.com/@..."
                  value={draft.url}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, url: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-muted/25 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                  Imagens de fundo
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Várias imagens alternam como no topo da página. Formatos: PNG,
                  JPG, WebP.
                </p>
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => multiRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Adicionar imagens
                  </Button>
                  {(draft.slides || []).length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSlides}
                    >
                      Limpar todas
                    </Button>
                  ) : null}
                </div>
                {(draft.slides || []).length > 0 ? (
                  <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                    {(draft.slides || []).map((src, i) => (
                      <li
                        key={`${i}-${String(src).slice(0, 40)}`}
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
                          onClick={() => removeSlideAt(i)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-4 rounded-lg border border-border p-3 bg-muted/20">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                  Transição do carrossel
                </p>
                <div className="space-y-2">
                  <Label htmlFor="ch-interval">
                    Intervalo entre imagens (segundos)
                  </Label>
                  <Input
                    id="ch-interval"
                    type="text"
                    inputMode="decimal"
                    className="h-9"
                    value={draft.intervalDraft}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, intervalDraft: e.target.value } : d,
                      )
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tempo que cada foto fica visível (deve ser maior que a
                    duração da transição).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ch-trans-dur">
                    Duração da transição (segundos)
                  </Label>
                  <Input
                    id="ch-trans-dur"
                    type="text"
                    inputMode="decimal"
                    className="h-9"
                    value={draft.transitionDraft}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, transitionDraft: e.target.value } : d,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ch-trans-type">Tipo de transição</Label>
                  <Select
                    value={draft.transitionMode}
                    onValueChange={(v) =>
                      setDraft((d) =>
                        d ? { ...d, transitionMode: v } : d,
                      )
                    }
                  >
                    <SelectTrigger id="ch-trans-type" className="h-9">
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
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={saveEditor} disabled={!draft}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

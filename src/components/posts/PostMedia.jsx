import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, ExternalLink } from "lucide-react";
import { Slider } from "@/components/ui/slider";

function isImageMime(mime) {
  return typeof mime === "string" && mime.startsWith("image/");
}
function isVideoMime(mime) {
  return typeof mime === "string" && mime.startsWith("video/");
}
function isAudioMime(mime) {
  return typeof mime === "string" && mime.startsWith("audio/");
}

function ImageCarousel({ urls, intervalSec, showControls = true }) {
  const [index, setIndex] = useState(0);
  const [delay, setDelay] = useState(() =>
    Math.min(60, Math.max(2, Number(intervalSec) || 5)),
  );

  useEffect(() => {
    setDelay(Math.min(60, Math.max(2, Number(intervalSec) || 5)));
  }, [intervalSec]);

  useEffect(() => {
    if (!urls?.length) return;
    if (urls.length <= 1) return;
    const ms = delay * 1000;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % urls.length);
    }, ms);
    return () => clearInterval(t);
  }, [urls, delay]);

  useEffect(() => {
    setIndex((i) => (urls?.length ? Math.min(i, urls.length - 1) : 0));
  }, [urls]);

  if (!urls?.length) return null;

  const safeIndex = Math.min(index, urls.length - 1);
  const go = (dir) => {
    setIndex((i) => {
      const n = urls.length;
      if (dir < 0) return (i - 1 + n) % n;
      return (i + 1) % n;
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/5 border border-border">
        <img
          src={urls[safeIndex]}
          alt=""
          className="w-full h-full object-contain bg-black/80"
        />
        {urls.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border shadow flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => go(-1)}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Seguinte"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border shadow flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => go(1)}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {urls.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Imagem ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === safeIndex ? "w-6 bg-accent" : "w-2 bg-background/70"
                  }`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {showControls && urls.length > 1 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <Clock className="w-4 h-4" />
            <span>Tempo entre imagens: {delay}s</span>
          </div>
          <Slider
            value={[delay]}
            onValueChange={(v) => setDelay(v[0])}
            min={2}
            max={20}
            step={1}
            className="flex-1"
          />
        </div>
      ) : null}
    </div>
  );
}

export function PostMedia({ anexos, intervalSec }) {
  const items = Array.isArray(anexos) ? anexos : [];
  const images = items
    .map((a) => (a && a.url && isImageMime(a.mime) ? a.url : null))
    .filter(Boolean);

  if (images.length >= 4) {
    const show = images.slice(0, 16);
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden border border-border bg-muted/10">
          {show.map((src, i) => (
            <div key={`${src}-${i}`} className="aspect-square bg-muted/30">
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        {images.length > 16 ? (
          <p className="text-xs text-muted-foreground">
            +{images.length - 16} imagem(ns)
          </p>
        ) : null}
        <ImageCarousel
          key={images.join("|")}
          urls={images}
          intervalSec={intervalSec}
          showControls={images.length > 1}
        />
      </div>
    );
  }

  if (images.length > 0) {
    return (
      <ImageCarousel
        key={images.join("|")}
        urls={images}
        intervalSec={intervalSec}
        showControls={images.length > 1}
      />
    );
  }

  const first = items.find((a) => a && a.url);
  if (first?.url && isVideoMime(first.mime)) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden border bg-black">
        <video src={first.url} className="w-full h-full" controls />
      </div>
    );
  }
  if (first?.url && isAudioMime(first.mime)) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <audio src={first.url} controls className="w-full" />
      </div>
    );
  }
  if (items.length > 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground mb-2">Anexos</p>
        <ul className="space-y-2">
          {items.map((a, i) => (
            <li key={`${a?.url || "file"}-${i}`} className="text-sm">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline break-all inline-flex items-center gap-1"
              >
                {a.name || `Arquivo ${i + 1}`} <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {a.mime ? (
                <span className="text-xs text-muted-foreground ml-2">
                  {a.mime}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}


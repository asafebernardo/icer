import { ExternalLink } from "lucide-react";

import PostImagesBlock from "@/components/posts/PostImagesBlock";
import PostGalleryByDay from "@/components/posts/PostGalleryByDay";
import {
  appendYoutubeSlidesFromUrls,
  buildSlidesFromAnexos,
  normalizeDiasGaleria,
  normalizeVideoUrlsFromPost,
  openPostMediaPresentation,
} from "@/lib/posts";

function isVideoMime(mime) {
  return typeof mime === "string" && mime.startsWith("video/");
}
function isAudioMime(mime) {
  return typeof mime === "string" && mime.startsWith("audio/");
}

export function PostMedia({
  anexos,
  /** Legado: primeira URL de vídeo externo */
  video_url = "",
  /** Várias URLs (ex. YouTube) — slides depois dos anexos */
  video_urls,
  intervalSec,
  showPresentationButton = false,
  galleryAdmin = null,
  usarGaleriaPorDia = false,
  diasGaleria = null,
  audioAmbienteUrl = "",
  audioAmbienteEscopo = "todas_secoes",
}) {
  const items = Array.isArray(anexos) ? anexos : [];
  let slides = buildSlidesFromAnexos(items);
  const ytUrls = normalizeVideoUrlsFromPost({ video_url, video_urls });
  slides = appendYoutubeSlidesFromUrls(slides, ytUrls);

  const diasNorm = normalizeDiasGaleria(diasGaleria);
  const showPorDia =
    usarGaleriaPorDia &&
    diasNorm.some((d) => Array.isArray(d.imagens_urls) && d.imagens_urls.length);

  const bgUrl = String(audioAmbienteUrl || "").trim();
  const presentationOpts =
    bgUrl ? { audioAmbienteUrl: bgUrl, bgMusicAllowed: true } : {};

  if (showPorDia) {
    return (
      <PostGalleryByDay
        diasGaleria={diasNorm}
        anexos={items}
        intervalSec={intervalSec}
        showPresentationButton={showPresentationButton}
        audioAmbienteUrl={audioAmbienteUrl}
        audioAmbienteEscopo={audioAmbienteEscopo}
      />
    );
  }

  if (slides.length > 0) {
    return (
      <PostImagesBlock
        slides={slides}
        intervalSec={intervalSec}
        showFullscreenEntry={showPresentationButton}
        audioAmbienteUrl={audioAmbienteUrl}
        audioAmbienteAtivo
        onFullscreenButton={(idx) =>
          openPostMediaPresentation(slides, idx, presentationOpts)
        }
        onSlideImageActivate={
          showPresentationButton
            ? (idx) => openPostMediaPresentation(slides, idx, presentationOpts)
            : undefined
        }
        adminGallery={galleryAdmin}
      />
    );
  }

  const first = items.find((a) => a && a.url);
  if (first?.url && isVideoMime(first.mime)) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden border bg-black">
        <video src={first.url} className="h-full w-full" controls />
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
        <p className="mb-2 text-sm font-medium text-foreground">Anexos</p>
        <ul className="space-y-2">
          {items.map((a, i) => (
            <li key={`${a?.url || "file"}-${i}`} className="text-sm">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-accent hover:underline"
              >
                {a.name || `Arquivo ${i + 1}`}{" "}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {a.mime ? (
                <span className="ml-2 text-xs text-muted-foreground">
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

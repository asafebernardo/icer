import { useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

import PostImagesBlock from "@/components/posts/PostImagesBlock";
import {
  normalizeDiasGaleria,
  openPostMediaPresentation,
  urlsToSlides,
} from "@/lib/posts";

/**
 * Título da secção (cadastro); posts antigos só com data legada usam a data formatada.
 */
export function formatSecaoGaleriaHeading(dia, idx) {
  const t = String(dia?.titulo || "").trim();
  if (t) return t;
  const legacyDate = String(dia?.data_dia || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(legacyDate)) {
    try {
      const d = parseISO(`${legacyDate}T12:00:00`);
      if (isValid(d)) {
        return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
    } catch {
      /* fallthrough */
    }
    return legacyDate;
  }
  return `Secção ${idx + 1}`;
}

/**
 * Galeria pública em secções (ordem do cadastro).
 * `anexos` resolve se cada URL é foto ou vídeo.
 * @param {(sectionIndex: number, slideIndex: number) => void} [onRemoveSlideFromSection] — só edição: remove URL da secção (miniatura).
 */
export default function PostGalleryByDay({
  diasGaleria,
  anexos = [],
  intervalSec = 5,
  showPresentationButton = false,
  showMediaKindBadge = false,
  onRemoveSlideFromSection = null,
  audioAmbienteUrl = "",
  audioAmbienteEscopo = "todas_secoes",
}) {
  const sectionsWithIndices = useMemo(() => {
    const norm = normalizeDiasGaleria(diasGaleria);
    const out = [];
    norm.forEach((d, sectionIndex) => {
      if (d.imagens_urls.filter(Boolean).length > 0) {
        out.push({ dia: d, sectionIndex });
      }
    });
    return out;
  }, [diasGaleria]);

  if (!sectionsWithIndices.length) return null;

  return (
    <div className="space-y-12">
      {sectionsWithIndices.map(({ dia, sectionIndex }) => {
        const imgs = dia.imagens_urls.filter(Boolean);
        const heading = formatSecaoGaleriaHeading(dia, sectionIndex);
        const slides = urlsToSlides(imgs, anexos);
        const bgUrl = String(audioAmbienteUrl || "").trim();
        const musicThisSection =
          !bgUrl ||
          audioAmbienteEscopo !== "por_secao" ||
          dia.musica_ambiente !== false;
        const presentationOpts =
          bgUrl && musicThisSection
            ? { audioAmbienteUrl: bgUrl, bgMusicAllowed: true }
            : bgUrl
              ? { audioAmbienteUrl: bgUrl, bgMusicAllowed: false }
              : {};
        return (
          <section
            key={`sec-${sectionIndex}-${heading}-${imgs[0]?.slice(-24) || sectionIndex}`}
            className="space-y-4"
          >
            <h3 className="border-b border-border pb-2 text-lg font-semibold tracking-tight text-foreground">
              {heading}
            </h3>
            <PostImagesBlock
              slides={slides}
              intervalSec={intervalSec}
              showFullscreenEntry={showPresentationButton}
              showMediaKindBadge={showMediaKindBadge}
              audioAmbienteUrl={audioAmbienteUrl}
              audioAmbienteAtivo={musicThisSection}
              onFullscreenButton={(i) =>
                openPostMediaPresentation(slides, i, presentationOpts)
              }
              onSlideImageActivate={
                showPresentationButton
                  ? (i) => openPostMediaPresentation(slides, i, presentationOpts)
                  : undefined
              }
              onRemoveGallerySlide={
                typeof onRemoveSlideFromSection === "function"
                  ? (slideIdx) =>
                      onRemoveSlideFromSection(sectionIndex, slideIdx)
                  : undefined
              }
            />
          </section>
        );
      })}
    </div>
  );
}

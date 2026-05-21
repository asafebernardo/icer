import { getSlideCaptionLabel } from "@/lib/posts";

/**
 * Legenda sobreposta na parte inferior da imagem/vídeo no modal de visualização.
 */
export default function SlideMediaCaption({ slide }) {
  const label = getSlideCaptionLabel(slide);
  if (!label) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-3 pt-12"
      aria-hidden
    >
      <p className="line-clamp-2 text-center text-sm font-medium leading-snug text-white drop-shadow-md">
        {label}
      </p>
    </div>
  );
}

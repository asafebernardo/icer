import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Film, Trash2 } from "lucide-react";

import SafeImg from "@/components/shared/SafeImg";
import MediaKindCornerBadge from "@/components/shared/MediaKindCornerBadge";
import { AnexoPreviewOpenButton } from "@/components/posts/EditorAnexoSlidesPreviewDialog";
import { GalleryFeaturedStar } from "@/components/posts/PostImagesBlock";
import { cn } from "@/lib/utils";

/** 5 cartões/fila; contentor com `gap-2` → 4× gap = 2rem entre 5 colunas. */
export const ANEXO_ORDER_MOSAIC_COLS = 5;
export const ANEXO_ORDER_MOSAIC_CELL = "calc((100% - 2rem) / 5)";

function isImageMime(mime) {
  return typeof mime === "string" && mime.startsWith("image/");
}

function isVideoMime(mime) {
  return typeof mime === "string" && mime.startsWith("video/");
}

/** Identificador estável por ficheiro (ordenação sem índice). Desambigua duplicados. */
function buildSortableIds(anexos) {
  const seen = new Map();
  return anexos.map((a, i) => {
    const u = String(a?.url ?? "");
    const n = String(a?.name ?? "");
    const s = Number(a?.size) || 0;
    const m = String(a?.mime ?? "");
    let base = `anexo-${[u, n, s, m].join("\0").replace(/[^\w.-]+/g, "_").slice(0, 220)}`;
    if (!u && !n) base = `anexo-fallback-${i}`;
    let id = base;
    let k = 1;
    while (seen.has(id)) {
      id = `${base}__${k++}`;
    }
    seen.set(id, true);
    return id;
  });
}

function AnexoOrderRemoveButton({ onRemove, label }) {
  if (typeof onRemove !== "function") return null;
  return (
    <button
      type="button"
      className="absolute left-1 bottom-1 z-[35] flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/95 text-destructive shadow-sm transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
      }}
      aria-label={label}
    >
      <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );
}

function SortableAnexoCard({
  id,
  a,
  index,
  imagemDestaqueUrl,
  setImagemDestaqueUrl,
  imageUrlsForFeatured,
  onRemoveAt,
  onPreviewAt,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const isImg = a && isImageMime(a.mime) && a.url;
  const isVideo = a && isVideoMime(a.mime) && a.url;
  const firstImageUrl = imageUrlsForFeatured[0] || "";
  const explicit = String(imagemDestaqueUrl || "").trim();
  const featuredRing =
    (explicit && explicit === a.url) ||
    (!explicit && isImg && a.url === firstImageUrl);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    flex: `0 0 ${ANEXO_ORDER_MOSAIC_CELL}`,
    width: ANEXO_ORDER_MOSAIC_CELL,
    maxWidth: ANEXO_ORDER_MOSAIC_CELL,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-square min-w-0 cursor-grab touch-none overflow-hidden rounded-xl border bg-muted/30 outline-none transition-shadow active:cursor-grabbing",
        isDragging && "z-20 opacity-95 shadow-lg ring-2 ring-accent",
        featuredRing
          ? "ring-2 ring-amber-400 shadow-md"
          : "border-border",
      )}
      aria-label={`Arrastar anexo ${index + 1} — ordem no carrossel`}
      {...attributes}
      {...listeners}
    >
      {(isImg || isVideo) && typeof onPreviewAt === "function" ? (
        <AnexoPreviewOpenButton
          className="absolute left-1 top-1 z-[30]"
          onClick={() => onPreviewAt(index)}
        />
      ) : null}
      <AnexoOrderRemoveButton
        onRemove={() => onRemoveAt?.(index)}
        label={`Remover anexo ${index + 1}`}
      />
      {isImg ? (
        <>
          <GalleryFeaturedStar
            src={a.url}
            starCtl={{
              value: imagemDestaqueUrl,
              onChange: setImagemDestaqueUrl,
            }}
            defaultThumbUrl={firstImageUrl}
          />
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
            <SafeImg
              src={a.url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <MediaKindCornerBadge kind="image" />
        </>
      ) : isVideo ? (
        <>
          <GalleryFeaturedStar
            src={a.url}
            starCtl={{
              value: imagemDestaqueUrl,
              onChange: setImagemDestaqueUrl,
            }}
            defaultThumbUrl={firstImageUrl}
          />
          <video
            src={a.url}
            muted
            playsInline
            preload="metadata"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
          />
          <MediaKindCornerBadge kind="video" />
        </>
      ) : (
        <>
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/50 px-1 pt-7 text-center">
            <Film
              className="h-8 w-8 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="line-clamp-2 w-full text-[10px] text-muted-foreground">
              {a?.name || `Vídeo ${index + 1}`}
            </span>
          </div>
          <MediaKindCornerBadge kind="video" />
        </>
      )}
    </div>
  );
}

/**
 * Mosaico 5 colunas com arrastar que funciona entre linhas (@hello-pangea falha com wrap).
 */
export default function AnexoOrderMosaicDnd({
  anexos,
  onReorderAnexos,
  imagemDestaqueUrl,
  setImagemDestaqueUrl,
  imageUrlsForFeatured,
  onRemoveAt,
  onPreviewAt,
}) {
  const sortableIds = useMemo(() => buildSortableIds(anexos), [anexos]);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeIndex = activeId
    ? sortableIds.indexOf(String(activeId))
    : -1;
  const activeAnexo = activeIndex >= 0 ? anexos[activeIndex] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={({ active, over }) => {
        setActiveId(null);
        if (!over || active.id === over.id) return;
        const oldIndex = sortableIds.indexOf(String(active.id));
        const newIndex = sortableIds.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;
        onReorderAnexos(arrayMove(anexos, oldIndex, newIndex));
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div
          className="flex w-full min-w-0 flex-wrap content-start gap-2 pb-2"
          style={{ ["--anexo-mosaic-cell"]: ANEXO_ORDER_MOSAIC_CELL }}
        >
          {anexos.map((a, index) => (
            <SortableAnexoCard
              key={sortableIds[index]}
              id={sortableIds[index]}
              a={a}
              index={index}
              imagemDestaqueUrl={imagemDestaqueUrl}
              setImagemDestaqueUrl={setImagemDestaqueUrl}
              imageUrlsForFeatured={imageUrlsForFeatured}
              onRemoveAt={onRemoveAt}
              onPreviewAt={onPreviewAt}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeAnexo && activeIndex >= 0 ? (
          <div
            className="relative aspect-square h-28 w-28 min-w-0 overflow-hidden rounded-xl border border-border bg-muted/30 shadow-xl ring-2 ring-accent sm:h-32 sm:w-32"
          >
            {isImageMime(activeAnexo.mime) && activeAnexo.url ? (
              <SafeImg
                src={activeAnexo.url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted/50 p-2 text-center">
                <Film className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

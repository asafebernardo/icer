import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Images,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SafeImg from "@/components/shared/SafeImg";
import {
  collectPostImageUrls,
  getPostFeedThumbnailUrl,
  normalizePost,
} from "@/lib/posts";
import {
  POST_FEED_SECTION_LABELS,
  resolvePostCategoria,
} from "@/lib/postCategories";
import { cn } from "@/lib/utils";

const SHORT_CATEGORY_TAGS = {
  culto_dominical: "Culto",
  ceia: "Ceia",
  oracao: "Oração",
  clube_biblico: "Clube",
  estudos_biblicos: "Estudos",
  acao_de_gracas: "Ação de graças",
  dia_das_maes: "Mães",
  dia_das_pais: "Pais",
  natal: "Natal",
  pascoa: "Páscoa",
  batismo: "Batismo",
  encontro_de_casais: "Casais",
  encontro_feminino: "Feminino",
  encontro_masculino: "Masculino",
  encontro_de_jovens: "Jovens",
  conferencias: "Conferências",
  noticias: "Notícias",
};

function formatPubDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(typeof iso === "string" ? iso : iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function categoryTagLabel(categoryKey, fullLabel) {
  if (SHORT_CATEGORY_TAGS[categoryKey]) return SHORT_CATEGORY_TAGS[categoryKey];
  return fullLabel || categoryKey;
}

export default function PostFeedCard({
  post,
  location,
  categoryKey: categoryKeyProp,
  hideCategory = false,
  canEdit,
  canDelete,
  onDelete,
  waitForPreview = false,
}) {
  const p = normalizePost(post);
  const resolvedCategory = resolvePostCategoria(p);
  const categoryKey = categoryKeyProp || resolvedCategory || "";
  const categoriaLabel = resolvedCategory
    ? POST_FEED_SECTION_LABELS[resolvedCategory] || resolvedCategory
    : null;
  const shortTag = categoryTagLabel(categoryKey, categoriaLabel);
  const isDraft = p.status === "draft" || p.is_draft;
  const photoCount = collectPostImageUrls(p).length;
  const dateLabel = formatPubDate(p.data_publicacao);
  const thumb = getPostFeedThumbnailUrl(post);
  const returnFrom = location.pathname + (location.search || "");
  const showMenu = canEdit || canDelete;
  const pessoas =
    Number.isFinite(Number(p.pessoas)) && Number(p.pessoas) > 0
      ? Math.floor(Number(p.pessoas))
      : Number.isFinite(Number(p.participantes)) && Number(p.participantes) > 0
        ? Math.floor(Number(p.participantes))
        : null;

  const needsPreviewWait = waitForPreview && Boolean(thumb);
  const [previewReady, setPreviewReady] = useState(!needsPreviewWait);

  useEffect(() => {
    if (!(waitForPreview && thumb)) {
      setPreviewReady(true);
      return;
    }

    setPreviewReady(false);
    let cancelled = false;
    const probe = new Image();
    const finish = () => {
      if (!cancelled) setPreviewReady(true);
    };
    probe.onload = finish;
    probe.onerror = finish;
    probe.src = thumb;
    if (probe.complete) finish();

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [waitForPreview, thumb, post?.id]);

  return (
    <article
      className={cn(
        "post-feed-card group relative h-full overflow-hidden",
        needsPreviewWait && !previewReady && "post-feed-card--loading",
      )}
    >
      {needsPreviewWait && !previewReady ? (
        <div
          className="post-feed-card__placeholder absolute inset-0 z-[3] animate-pulse bg-white/[0.04]"
          aria-busy="true"
          aria-label="A carregar pré-visualização"
        />
      ) : null}

      <Link
        to={`/Post/${post.id}`}
        state={{ from: returnFrom }}
        className={cn(
          "post-feed-card__link focus-ring relative block h-full min-h-[14rem] w-full sm:min-h-[15.5rem] md:min-h-[16.5rem]",
          needsPreviewWait && !previewReady && "pointer-events-none opacity-0",
        )}
        tabIndex={needsPreviewWait && !previewReady ? -1 : undefined}
        aria-hidden={needsPreviewWait && !previewReady ? true : undefined}
      >
        {thumb ? (
          <SafeImg
            src={thumb}
            alt=""
            loading={waitForPreview ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950"
            aria-hidden
          />
        )}

        <div className="post-feed-card__scrim pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative z-[1] flex h-full flex-col justify-end p-3 sm:p-3.5">
          <div className="max-w-full pr-10">
            {!hideCategory && shortTag ? (
              <p className="mb-1.5 text-[10px] font-semibold leading-none tracking-wide text-emerald-400 sm:text-[11px]">
                {shortTag}
              </p>
            ) : null}

            <h3 className="line-clamp-3 font-display text-[14px] font-bold leading-snug tracking-tight text-white drop-shadow-sm sm:text-[15px] md:text-[16px]">
              {p.titulo}
            </h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-white/75 sm:text-[11px]">
              {dateLabel ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                  <time dateTime={String(p.data_publicacao || "")}>
                    {dateLabel}
                  </time>
                </span>
              ) : null}
              {pessoas != null ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                  {pessoas.toLocaleString("pt-BR")}
                </span>
              ) : null}
              {isDraft ? (
                <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-100">
                  Rascunho
                </span>
              ) : null}
            </div>
          </div>

          {photoCount > 0 ? (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-1 text-[10px] font-semibold text-slate-800 shadow-sm backdrop-blur-sm sm:bottom-3.5 sm:right-3.5">
              <Images className="h-3 w-3" aria-hidden />
              {photoCount}
            </span>
          ) : null}
        </div>
      </Link>

      {showMenu && previewReady ? (
        <div className="absolute right-2 top-2 z-[2] sm:right-2.5 sm:top-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/35 text-white/90 backdrop-blur-sm hover:bg-black/55 hover:text-white"
                aria-label="Mais opções"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[9rem]">
              {canEdit ? (
                <DropdownMenuItem asChild>
                  <Link
                    to={`/Eventos/editar/${post.id}`}
                    state={{ from: returnFrom }}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Editar
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete?.(post.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Eliminar
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </article>
  );
}

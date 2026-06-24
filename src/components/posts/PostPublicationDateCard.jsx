import { Link } from "react-router-dom";
import { CalendarDays, FileText, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import SafeImg from "@/components/shared/SafeImg";
import {
  formatPostPublicationDayMonth,
  getPostFeedThumbnailUrl,
  normalizePost,
} from "@/lib/posts";
import { cn } from "@/lib/utils";

function shortTitle(titulo) {
  const s = String(titulo || "").trim();
  if (!s) return "Publicação";
  return s.length > 56 ? `${s.slice(0, 56).trim()}…` : s;
}

export default function PostPublicationDateCard({
  post,
  location,
  fallbackThumb = null,
  canEdit,
  canDelete,
  onDelete,
}) {
  const p = normalizePost(post);
  const thumb = getPostFeedThumbnailUrl(p) || fallbackThumb;
  const dateLabel = formatPostPublicationDayMonth(p.data_publicacao);
  const title = shortTitle(p.titulo);
  const isDraft = p.status === "draft" || p.is_draft;
  const fromPath = location?.pathname
    ? location.pathname + (location.search || "")
    : undefined;

  const content = (
    <>
      <div className="post-category-tile__media" aria-hidden>
        {thumb ? (
          <SafeImg
            src={thumb}
            alt=""
            className="post-category-tile__img post-year-group-tile__img"
            loading="lazy"
            fetchPriority="low"
            sizes="(max-width: 767px) 50vw, 33vw"
          />
        ) : (
          <div className="post-year-tile__placeholder">
            <FileText className="h-8 w-8 text-[#475569]/70" />
          </div>
        )}
        <div className="post-year-group-tile__blur" aria-hidden />
        <div className="post-category-tile__overlay post-year-group-tile__overlay" />
        <div className="post-category-tile__vignette" />
      </div>

      <div className="post-category-tile__content post-year-group-tile__content">
        <p className="post-year-group-tile__eyebrow">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Data da publicação
        </p>
        <h2 className="post-category-tile__title post-publication-date-tile__date">
          <time dateTime={String(p.data_publicacao || "")}>{dateLabel}</time>
        </h2>
        <p className="post-category-tile__meta">
          {title}
          {isDraft ? " · Rascunho" : ""}
        </p>
      </div>

      <div className="post-category-tile__shine" aria-hidden />
    </>
  );

  return (
    <article
      className={cn(
        "post-category-tile post-year-group-tile post-publication-date-tile group relative",
      )}
    >
      <Link
        to={`/Post/${post.id}`}
        state={{ from: fromPath }}
        className="block h-full focus-ring rounded-[20px]"
        aria-label={`Ver publicação de ${dateLabel}: ${title}`}
      >
        {content}
      </Link>

      {canEdit || canDelete ? (
        <div className="absolute right-2 top-2 z-[4] flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full border border-white/10 bg-[#08111F]/80 text-[#94A3B8] hover:text-[#F8FAFC]"
              title="Editar"
              asChild
            >
              <Link
                to={`/Eventos/editar/${post.id}`}
                state={{
                  from: location?.pathname
                    ? location.pathname + (location.search || "")
                    : undefined,
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full border border-white/10 bg-[#08111F]/80 text-[#94A3B8] hover:text-destructive"
              title="Eliminar"
              onClick={() => onDelete?.(post.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

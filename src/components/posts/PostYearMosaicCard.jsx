import { Link } from "react-router-dom";
import { CalendarDays, FileText, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import SafeImg from "@/components/shared/SafeImg";
import { getPostFeedThumbnailUrl, getPostPublicationYear, normalizePost } from "@/lib/posts";
import {
  feedItemHref,
  feedItemThumbnail,
  feedItemYear,
  isEventoFeedItem,
} from "@/lib/noticiasFeed";
import { isExamplePostId } from "@/data/posts.examples";
import { cn } from "@/lib/utils";

export default function PostYearMosaicCard({
  post,
  location,
  canEdit,
  canDelete,
  onDelete,
}) {
  const isEvento = isEventoFeedItem(post);
  const example = !isEvento && isExamplePostId(post.id);
  const p = isEvento ? post : normalizePost(post);
  const year = feedItemYear(post) ?? getPostPublicationYear(p);
  const yearLabel = year != null ? String(year) : "—";
  const thumb = isEvento ? feedItemThumbnail(post) : getPostFeedThumbnailUrl(p);
  const isDraft = !isEvento && (p.status === "draft" || p.is_draft);
  const href = feedItemHref(post);

  return (
    <article className="post-category-tile post-year-tile group relative">
      <Link
        to={href}
        state={{ from: location.pathname + location.search }}
        className="block h-full focus-ring rounded-[20px]"
        aria-label={`Ver ${isEvento ? "evento" : "publicação"} de ${yearLabel}`}
      >
        <div className="post-category-tile__media" aria-hidden>
          {thumb ? (
              <SafeImg
                src={thumb}
                alt=""
                className="post-category-tile__img"
                loading="lazy"
                fetchPriority="low"
                sizes="(max-width: 767px) 50vw, 33vw"
              />
          ) : (
            <div className="post-year-tile__placeholder">
              {isEvento ? (
                <CalendarDays className="h-8 w-8 text-[#475569]/70" />
              ) : (
                <FileText className="h-8 w-8 text-[#475569]/70" />
              )}
            </div>
          )}
          <div className="post-category-tile__overlay" />
          <div className="post-category-tile__vignette" />
        </div>

        <div className="post-category-tile__content">
          <h2 className="post-category-tile__title">{yearLabel}</h2>
          {isEvento || isDraft || example ? (
            <p className="post-category-tile__meta">
              {[
                isEvento ? "Evento" : null,
                isDraft ? "Rascunho" : null,
                example ? "Exemplo" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="post-category-tile__shine" aria-hidden />
      </Link>

      {(canEdit || canDelete) && !example && !isEvento ? (
        <div className="absolute right-2 top-2 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {canEdit ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7 border border-white/10 bg-[#08111F]/90 text-[#94A3B8] shadow-md hover:text-[#F8FAFC]"
              title="Editar"
              asChild
            >
              <Link to={`/Posts/editar/${post.id}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                "h-7 w-7 border border-white/10 bg-[#08111F]/90 text-[#94A3B8] shadow-md hover:text-destructive",
              )}
              title="Eliminar"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

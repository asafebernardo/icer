import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import SafeImg from "@/components/shared/SafeImg";
import { normalizePost, getPostFeedThumbnailUrl } from "@/lib/posts";
import { isExamplePostId } from "@/data/posts.examples";
import {
  POST_CATEGORIA_LABELS,
  resolvePostCategoria,
} from "@/lib/postCategories";

function formatPubDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(typeof iso === "string" ? iso : iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function shortDescription(descricao) {
  const s = String(descricao || "").trim();
  if (!s) return null;
  return s.length > 80 ? `${s.slice(0, 80).trim()}…` : s;
}

function FeedThumbnail({ post }) {
  const thumb = getPostFeedThumbnailUrl(post);

  if (!thumb) {
    return (
      <div
        className="post-feed-thumb post-feed-thumb--empty relative flex h-[54px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] sm:h-[56px] sm:w-[100px]"
        aria-hidden
      >
        <FileText className="h-5 w-5 text-[#475569]/80" />
      </div>
    );
  }

  return (
    <div className="post-feed-thumb relative h-[54px] w-[96px] shrink-0 overflow-hidden rounded-[8px] sm:h-[56px] sm:w-[100px]">
      <SafeImg
        src={thumb}
        alt=""
        className="h-full w-full object-cover brightness-[0.88] saturate-[0.76] transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[8px] bg-gradient-to-r from-[#020814]/50 via-[#020814]/15 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[8px] ring-1 ring-inset ring-white/[0.05]"
        aria-hidden
      />
    </div>
  );
}

export default function PostFeedCard({
  post,
  location,
  hideCategory = false,
  canEdit,
  canDelete,
  onDelete,
}) {
  const p = normalizePost(post);
  const example = isExamplePostId(post.id);
  const categoria = resolvePostCategoria(p);
  const categoriaLabel = categoria
    ? POST_CATEGORIA_LABELS[categoria] || categoria
    : null;
  const description = shortDescription(p.descricao);
  const isDraft = p.status === "draft" || p.is_draft;

  return (
    <article className="post-feed-card group relative">
      <Link
        to={`/Post/${post.id}`}
        state={{ from: location.pathname + location.search }}
        className="flex items-start gap-3 rounded-[10px] px-3 py-2.5 sm:gap-3.5 sm:px-3.5 sm:py-3 focus-ring"
      >
        <FeedThumbnail post={post} />

        <div className="min-w-0 flex-1 pt-0.5">
          {!hideCategory && categoriaLabel ? (
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#64748B]">
              {categoriaLabel}
            </p>
          ) : null}

          <h3 className="line-clamp-2 font-display text-[14px] font-semibold leading-snug tracking-tight text-[#F8FAFC] transition-colors duration-200 group-hover:text-[#93C5FD]">
            {p.titulo}
          </h3>

          {description ? (
            <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-[#64748B]">
              {description}
            </p>
          ) : null}

          <p className="mt-1.5 text-[10px] tabular-nums text-[#64748B]/80">
            <time dateTime={String(p.data_publicacao || "")}>
              {formatPubDate(p.data_publicacao)}
            </time>
            {isDraft ? (
              <span className="text-[#64748B]/60"> · Rascunho</span>
            ) : null}
            {example ? (
              <span className="text-[#64748B]/60"> · Exemplo</span>
            ) : null}
          </p>
        </div>
      </Link>

      {(canEdit || canDelete) && !example ? (
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[#64748B] hover:text-[#F8FAFC]"
              title="Editar"
              asChild
            >
              <Link to={`/Posts/editar/${post.id}`}>
                <Pencil className="h-3 w-3" />
              </Link>
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[#64748B] hover:text-destructive"
              title="Eliminar"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

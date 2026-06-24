import { Link } from "react-router-dom";
import { CalendarDays, FileText } from "lucide-react";

import SafeImg from "@/components/shared/SafeImg";
import { formatPostCount } from "@/hooks/usePostCategoryCounts";
import {
  getPostFeedThumbnailUrl,
  getPrimaryPostForYear,
  normalizePost,
  postYearToQueryValue,
} from "@/lib/posts";
import { cn } from "@/lib/utils";

export default function PostYearGroupCard({
  year,
  posts,
  categoryPath,
  location,
  fallbackThumb = null,
  opensPostDirectly = true,
}) {
  const yearLabel = year != null ? String(year) : "Sem data";
  const items = Array.isArray(posts) ? posts : [];
  const count = items.length;
  const primaryPost = getPrimaryPostForYear(items);
  const primary = primaryPost ? normalizePost(primaryPost) : null;
  const thumb =
    (primary ? getPostFeedThumbnailUrl(primary) : null) ||
    items
      .map((post) => getPostFeedThumbnailUrl(normalizePost(post)))
      .find(Boolean) ||
    fallbackThumb;
  const yearListHref = `${categoryPath}?ano=${encodeURIComponent(postYearToQueryValue(year))}`;
  const postHref =
    primary?.id != null ? `/Post/${primary.id}` : null;
  const href =
    opensPostDirectly && postHref ? postHref : yearListHref;
  const fromPath = location?.pathname
    ? location.pathname + (location.search || "")
    : categoryPath;

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
          Ano da publicação
        </p>
        <h2 className="post-category-tile__title post-year-group-tile__year">
          {yearLabel}
        </h2>
        <p className="post-category-tile__meta">
          {count > 0 ? formatPostCount(count) : "Sem publicações"}
        </p>
      </div>

      <div className="post-category-tile__shine" aria-hidden />
    </>
  );

  if (!href) {
    return (
      <article
        className={cn(
          "post-category-tile post-year-group-tile post-year-group-tile--empty",
        )}
        aria-label={`${yearLabel} — sem publicações`}
      >
        {content}
      </article>
    );
  }

  const ariaLabel =
    opensPostDirectly && postHref
      ? `Ver publicação de ${yearLabel}${count > 1 ? ` (${formatPostCount(count)})` : ""}`
      : count > 0
        ? `Ver publicações de ${yearLabel} (${formatPostCount(count)})`
        : `Ver publicações de ${yearLabel} — sem publicações`;

  return (
    <article className="post-category-tile post-year-group-tile group">
      <Link
        to={href}
        state={{ from: fromPath }}
        className="block h-full focus-ring rounded-[20px]"
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    </article>
  );
}

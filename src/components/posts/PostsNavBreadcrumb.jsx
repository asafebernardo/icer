import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  buildPostsNavPath,
  formatPostsNavPathPlain,
} from "@/lib/postsNavPath";
import { cn } from "@/lib/utils";

/**
 * Trilha: Posts › Categoria › Ceia › 2026
 * @param {{
 *   categoryKey?: string | null;
 *   year?: number | null;
 *   includeYear?: boolean;
 *   postTitle?: string | null;
 *   items?: Array<{ label: string, href?: string | null }>;
 *   variant?: "bar" | "plain";
 *   tone?: "hub" | "default";
 *   centered?: boolean;
 *   className?: string;
 * }} props
 */
export default function PostsNavBreadcrumb({
  groupId,
  categoryKey,
  year,
  includeYear,
  postTitle,
  items: itemsProp,
  variant = "bar",
  tone = "hub",
  centered = false,
  className,
}) {
  const items =
    itemsProp ??
    buildPostsNavPath({ groupId, categoryKey, year, includeYear, postTitle });

  if (!items.length) return null;

  if (variant === "plain") {
    return (
      <p
        className={cn(
          "text-[10px] font-medium tracking-wide line-clamp-2",
          tone === "hub" ? "text-[#64748B]" : "text-muted-foreground",
          className,
        )}
        title={formatPostsNavPathPlain(items)}
      >
        {formatPostsNavPathPlain(items)}
      </p>
    );
  }

  const hubLink =
    tone === "hub"
      ? "text-[#64748B] hover:text-[#94A3B8]"
      : undefined;
  const hubCurrent =
    tone === "hub" ? "font-medium text-[#94A3B8]" : undefined;

  return (
    <Breadcrumb className={cn(centered && "w-full max-w-full", className)}>
      <BreadcrumbList
        className={cn(
          "text-xs sm:text-[13px]",
          tone === "hub" && "text-[#64748B]",
          centered && "w-full justify-center flex-wrap gap-x-1 gap-y-0.5",
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const href = item.href;

          return (
            <span key={`${item.label}-${index}`} className="contents">
              {index > 0 ? (
                <BreadcrumbSeparator className="opacity-60">
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </BreadcrumbSeparator>
              ) : null}
              <BreadcrumbItem>
                {isLast || !href ? (
                  <BreadcrumbPage className={hubCurrent}>
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className={hubLink}>
                    <Link to={href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export { buildPostsNavPath, formatPostsNavPathPlain };

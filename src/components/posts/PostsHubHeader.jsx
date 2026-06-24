import PostsBackButton from "@/components/posts/PostsBackButton";
import { cn } from "@/lib/utils";

export default function PostsHubHeader({
  actions = null,
  backTo = null,
  backLabel = "Voltar",
  breadcrumb = null,
  className,
}) {
  if (!backTo && !actions && !breadcrumb) return null;

  return (
    <header className={cn("posts-hub-header", className)}>
      <div className="posts-hub-header__bar">
        <div className="posts-hub-header__start">
          {backTo ? (
            <PostsBackButton to={backTo} label={backLabel} />
          ) : (
            <span className="posts-hub-header__spacer" aria-hidden />
          )}
        </div>

        <div className="posts-hub-header__center">{breadcrumb}</div>

        <div className="posts-hub-header__end">
          {actions ?? <span className="posts-hub-header__spacer" aria-hidden />}
        </div>
      </div>
    </header>
  );
}

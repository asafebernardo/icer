import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostMedia } from "@/components/posts/PostMedia";

import { normalizePost, normalizeTagKey } from "@/lib/posts";

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from;

  const { data: postRaw, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const r = await fetch(`/api/data/posts/${id}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error("Não foi possível carregar o post.");
      return r.json();
    },
  });

  const post = useMemo(() => {
    return postRaw ? normalizePost(postRaw) : null;
  }, [postRaw]);

  return (
    <div>
      <PageHeader
        pageKey="postagens"
        tag="Comunidade"
        title={post?.titulo || "Post"}
        description="Publicação"
      />

      <section className="py-10 max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (typeof from === "string" && from.startsWith("/")) {
                navigate(from);
                return;
              }
              navigate(-1);
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">A carregar…</p>
        ) : !post ? (
          <p className="text-muted-foreground">Post não encontrado.</p>
        ) : (
          <div className="space-y-4">
            {Array.isArray(post.tags) && post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <Badge
                    key={
                      typeof normalizeTagKey === "function"
                        ? normalizeTagKey(t)
                        : String(t)
                    }
                    variant="secondary"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}

            <PostMedia
              anexos={post.anexos || []}
              intervalSec={post.carousel_interval_sec}
            />

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {post.descricao || ""}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


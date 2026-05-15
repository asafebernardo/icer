import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Package, RefreshCw, GitCommitHorizontal, Github, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function formatCommitDate(iso) {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

async function fetchSiteReleases() {
  const r = await fetch("/api/admin/site-releases", { credentials: "include" });
  if (!r.ok) {
    const t = await r.text();
    let msg = t;
    try {
      msg = JSON.parse(t).message || t;
    } catch {
      /* ignore */
    }
    throw new Error(msg || r.statusText);
  }
  return r.json();
}

export default function AdminSiteReleasesPanel() {
  const q = useQuery({
    queryKey: ["admin-site-releases"],
    queryFn: fetchSiteReleases,
  });

  const semver = String(import.meta.env.VITE_ICER_SEMVER || "").trim();
  const buildId = String(import.meta.env.VITE_ICER_BUILD_ID || "").trim();
  const feSha = String(import.meta.env.VITE_ICER_GIT_SHA || "").trim();
  const feBranch = String(import.meta.env.VITE_ICER_GIT_BRANCH || "").trim();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-900 shadow-sm dark:bg-teal-500/28 dark:text-teal-50">
            <History className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Atualizações</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Versões publicadas (tags Git), commits por versão, histórico recente do branch atual no
              servidor e o ficheiro <span className="font-mono text-xs">CHANGELOG.md</span> quando
              existir. No GitHub, cada commit no branch principal (ou em{" "}
              <span className="font-mono text-xs">ICER_GITHUB_COMMITS_BRANCH</span>) aparece como uma
              versão — por defeito o repo é{" "}
              <span className="font-mono text-xs">asafebernardo/icer</span> (outro com{" "}
              <span className="font-mono text-xs">ICER_GITHUB_REPO</span>). Só administradores vêem
              esta página.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
          Atualizar
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="font-semibold">Build do painel (front-end)</h3>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Versão npm</dt>
            <dd className="font-mono text-foreground">{semver || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Build</dt>
            <dd className="font-mono text-foreground">{buildId || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Commit (build Vite)</dt>
            <dd className="font-mono text-foreground">{feSha || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Branch (build Vite)</dt>
            <dd className="font-mono text-foreground">{feBranch || "—"}</dd>
          </div>
        </dl>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="font-semibold">Servidor (API Node)</h3>
        </div>
        {q.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ) : q.isError ? (
          <p className="text-sm text-destructive">{q.error?.message}</p>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Pacote</dt>
              <dd className="font-mono text-foreground">{q.data?.app?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Versão package.json</dt>
              <dd className="font-mono text-foreground">{q.data?.app?.version ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Git no servidor</dt>
              <dd className="text-foreground">
                {q.data?.git_available
                  ? "Repositório detetado — histórico abaixo."
                  : "Sem dados Git neste ambiente (ex.: imagem Docker sem pasta .git)."}
              </dd>
            </div>
          </dl>
        )}
      </motion.div>

      {!q.isLoading && !q.isError && q.data?.github ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-foreground">
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="font-semibold">GitHub (commit = versão)</h3>
            </div>
            {q.data.github.html_url ? (
              <a
                href={q.data.github.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-teal-700 underline-offset-4 hover:underline dark:text-teal-300"
              >
                {q.data.github.repo}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">{q.data.github.repo}</span>
            )}
          </div>
          {q.data.github.using_default_repo ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Repositório padrão do projeto. Para apontar a outro fork, defina{" "}
              <span className="font-mono">ICER_GITHUB_REPO</span> no ambiente do servidor.
            </p>
          ) : null}
          {q.data.github.commits_branch ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Histórico do branch{" "}
              <span className="font-mono text-foreground">{q.data.github.commits_branch}</span>
              {q.data.github.default_branch &&
              q.data.github.commits_branch !== q.data.github.default_branch ? (
                <>
                  {" "}
                  (predefinição do repo:{" "}
                  <span className="font-mono">{q.data.github.default_branch}</span>)
                </>
              ) : null}
              .
            </p>
          ) : null}
          {q.data.github.error ? (
            <p className="text-sm text-destructive">{q.data.github.error}</p>
          ) : q.data.github.commit_versions?.length ? (
            <ScrollArea className="max-h-[min(70vh,560px)] pr-3">
              <ul className="space-y-3 text-sm">
                {q.data.github.commit_versions.map((c) => (
                  <li
                    key={c.full_sha || c.sha}
                    className="flex gap-2 rounded-xl border border-border/60 bg-muted/15 p-3 dark:bg-muted/10"
                  >
                    <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        {c.commit_html_url ? (
                          <a
                            href={c.commit_html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                          >
                            {c.sha}
                          </a>
                        ) : (
                          <span className="font-mono text-xs font-semibold text-foreground">{c.sha}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatCommitDate(c.date)}</span>
                        {c.author ? (
                          <span className="text-xs text-muted-foreground">{c.author}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 break-words text-foreground">{c.subject}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum commit devolvido pela API.</p>
          )}
        </motion.div>
      ) : null}

      {!q.isLoading && !q.isError && q.data?.releases?.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-foreground">Versões (tags Git)</h3>
          <div className="space-y-4">
            {q.data.releases.map((rel) => (
              <div
                key={rel.tag}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
                  <span className="font-mono text-base font-semibold text-foreground">{rel.tag}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCommitDate(rel.tag_date)}
                  </span>
                </div>
                {rel.commits?.length ? (
                  <ul className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto pr-1 text-sm">
                    {rel.commits.map((c) => (
                      <li key={`${rel.tag}-${c.hash}-${c.date}`} className="flex gap-2">
                        <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-xs text-muted-foreground">{c.hash}</span>
                          <span className="mx-2 text-muted-foreground/50">·</span>
                          <span className="text-muted-foreground">{formatCommitDate(c.date)}</span>
                          <p className="break-words text-foreground">{c.subject}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem commits listados para esta tag.</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}

      {!q.isLoading && !q.isError && q.data?.recent_commits?.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="mb-3 text-lg font-semibold text-foreground">Commits recentes (HEAD)</h3>
          <ScrollArea className="max-h-[min(70vh,520px)] pr-3">
            <ul className="space-y-2 text-sm">
              {q.data.recent_commits.map((c) => (
                <li key={`${c.hash}-${c.date}-${c.subject}`} className="flex gap-2 border-b border-border/40 pb-2 last:border-0">
                  <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-muted-foreground">{c.hash}</span>
                    <span className="mx-2 text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">{formatCommitDate(c.date)}</span>
                    <p className="break-words text-foreground">{c.subject}</p>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </motion.div>
      ) : null}

      {!q.isLoading && !q.isError && q.data?.changelog_markdown ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <details className="group">
            <summary className="cursor-pointer list-none font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                CHANGELOG.md
                <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                  (expandir)
                </span>
              </span>
            </summary>
            <pre className="mt-4 max-h-[min(70vh,560px)] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
              {q.data.changelog_markdown}
            </pre>
          </details>
        </motion.div>
      ) : null}
    </div>
  );
}

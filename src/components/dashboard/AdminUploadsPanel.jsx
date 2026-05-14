import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileStack,
  File as FileIcon,
  RefreshCw,
  Search,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { withCsrfHeaderAsync, ensureCsrfCookieClient } from "@/lib/csrf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;

function formatBytes(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const b = Number(n);
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(2)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function formatTs(iso) {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "—";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

async function fetchAdminFiles({ skip, q }) {
  const sp = new URLSearchParams();
  sp.set("limit", String(PAGE_SIZE));
  sp.set("skip", String(skip));
  if (q.trim()) sp.set("q", q.trim());
  const r = await fetch(`/api/admin/files?${sp}`, { credentials: "include" });
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

async function fetchAdminFileDetail(id) {
  const r = await fetch(`/api/admin/files/${id}`, { credentials: "include" });
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

async function deleteAdminFileRequest(id, force) {
  await ensureCsrfCookieClient();
  const headers = await withCsrfHeaderAsync();
  const url =
    force === true
      ? `/api/admin/files/${id}?force=1`
      : `/api/admin/files/${id}`;
  const r = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  const text = await r.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (r.status === 409) {
    const err = new Error("in_use");
    err.status = 409;
    err.references = body?.references || [];
    throw err;
  }
  if (!r.ok) {
    throw new Error(body?.message || text || r.statusText);
  }
  return body;
}

function PreviewBody({ file }) {
  const mime = String(file?.mime || "");
  const src = `/api/files/${file.id}`;
  if (mime.startsWith("image/")) {
    return (
      <div className="flex max-h-[55vh] justify-center overflow-auto rounded-lg border border-border bg-muted/30 p-2">
        <img
          src={src}
          alt={file.original_name || ""}
          className="max-h-[50vh] max-w-full object-contain"
        />
      </div>
    );
  }
  if (mime.startsWith("video/")) {
    return (
      <video
        src={src}
        controls
        className="max-h-[50vh] w-full rounded-lg border border-border bg-black"
      />
    );
  }
  if (mime.startsWith("audio/")) {
    return (
      <audio src={src} controls className="w-full">
        <track kind="captions" />
      </audio>
    );
  }
  if (mime === "application/pdf" || String(file?.original_name || "").toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        title="Pré-visualização PDF"
        src={src}
        className="h-[50vh] w-full rounded-lg border border-border bg-background"
      />
    );
  }
  return (
    <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      Pré-visualização não disponível para este tipo ({mime || "desconhecido"}). Pode abrir o
      ficheiro num novo separador.
    </p>
  );
}

export default function AdminUploadsPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [delState, setDelState] = useState(null);
  const [delSubmitting, setDelSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(qInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const skip = page * PAGE_SIZE;
  const listQuery = useQuery({
    queryKey: ["admin-files", skip, qDebounced],
    queryFn: () => fetchAdminFiles({ skip, q: qDebounced }),
  });

  const detailQuery = useQuery({
    queryKey: ["admin-file-detail", detailId],
    queryFn: () => fetchAdminFileDetail(detailId),
    enabled: detailId != null,
  });

  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openDelete = (id, name) => {
    setDelState({ step: 1, id, name });
  };

  const runDelete = async (force) => {
    if (!delState) return;
    const { id } = delState;
    setDelSubmitting(true);
    try {
      await deleteAdminFileRequest(id, force);
      toast.success("Ficheiro removido.");
      queryClient.invalidateQueries({ queryKey: ["admin-files"] });
      queryClient.invalidateQueries({ queryKey: ["admin-file-detail"] });
      setDetailId((cur) => (cur === id ? null : cur));
      setDelState(null);
    } catch (e) {
      if (e?.status === 409 && !force) {
        setDelState({
          step: 2,
          id,
          name: delState.name,
          refs: Array.isArray(e.references) ? e.references : [],
        });
      } else {
        toast.error(e?.message || "Não foi possível remover.");
      }
    } finally {
      setDelSubmitting(false);
    }
  };

  const items = listQuery.data?.items ?? [];
  const file = detailQuery.data?.file;
  const references = detailQuery.data?.references ?? [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-900 shadow-sm shadow-orange-500/10 dark:bg-orange-500/28 dark:text-orange-50">
            <FileStack className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Ficheiros de upload
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Lista completa dos ficheiros registados na base. Consulte onde cada um é usado e
              remova órfãos com segurança; ficheiros em uso exigem confirmação extra.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-files"] })}
          disabled={listQuery.isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
          Atualizar
        </Button>
      </motion.div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar por nome ou tipo MIME…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            aria-label="Pesquisar ficheiros"
          />
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">{total} ficheiro(s)</p>
      </div>

      {listQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {listQuery.error?.message || "Erro ao carregar ficheiros."}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum ficheiro encontrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                <tr>
                  <th className="w-14 px-3 py-3"> </th>
                  <th className="px-3 py-3">Nome</th>
                  <th className="hidden px-3 py-3 sm:table-cell">MIME</th>
                  <th className="px-3 py-3">Tamanho</th>
                  <th className="hidden px-3 py-3 md:table-cell">Criado</th>
                  <th className="w-32 px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const isImg = String(row.mime || "").startsWith("image/");
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2">
                        {isImg ? (
                          <img
                            src={`/api/files/${row.id}?w=64&format=webp`}
                            alt=""
                            className="h-10 w-10 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2 font-mono text-xs text-foreground sm:max-w-xs">
                        {row.original_name || `— (#${row.id})`}
                      </td>
                      <td className="hidden max-w-[180px] truncate px-3 py-2 font-mono text-xs text-muted-foreground sm:table-cell">
                        {row.mime || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                        {formatBytes(row.size)}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground md:table-cell">
                        {formatTs(row.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Ver e utilizações"
                          onClick={() => setDetailId(row.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Remover"
                          onClick={() =>
                            openDelete(row.id, row.original_name || `#${row.id}`)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Página seguinte"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] max-w-[min(100vw-2rem,42rem)] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle className="font-mono text-base">
              {file ? file.original_name || `Ficheiro #${file.id}` : "Ficheiro"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-4rem)]">
            <div className="space-y-4 p-4">
              {detailQuery.isLoading ? (
                <Skeleton className="h-40 w-full rounded-lg" />
              ) : detailQuery.isError ? (
                <p className="text-sm text-destructive">{detailQuery.error?.message}</p>
              ) : file ? (
                <>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono">id {file.id}</span>
                    <span className="rounded-md bg-muted px-2 py-0.5">{file.mime}</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 tabular-nums">
                      {formatBytes(file.size)}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5">{formatTs(file.created_at)}</span>
                  </div>
                  <PreviewBody file={file} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a href={`/api/files/${file.id}`} target="_blank" rel="noopener noreferrer">
                        Abrir num novo separador
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        openDelete(file.id, file.original_name || `#${file.id}`)
                      }
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Remover
                    </Button>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">Onde é utilizado</h3>
                    {references.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma referência encontrada nas coleções indexadas (postagens, eventos,
                        materiais, galeria, avatares, configuração do site). Pode remover com
                        segurança relativamente a estes dados.
                      </p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {references.map((ref, idx) => (
                          <li
                            key={`${ref.kind}-${ref.id}-${idx}`}
                            className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{ref.label}</p>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                {ref.kind}
                                {ref.meta ? ` · ${ref.meta}` : ""}
                              </p>
                            </div>
                            {ref.href ? (
                              <Button
                                variant="link"
                                className="h-auto shrink-0 px-0 sm:self-center"
                                asChild
                              >
                                <Link to={ref.href}>Abrir</Link>
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={delState != null}
        onOpenChange={(open) => {
          if (!open && !delSubmitting) setDelState(null);
        }}
      >
        <AlertDialogContent className="z-[100] max-w-[min(calc(100vw-2rem),28rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {delState?.step === 2 ? "Ficheiro em uso" : "Remover este ficheiro?"}
            </AlertDialogTitle>
            {delState?.step === 1 ? (
              <AlertDialogDescription>
                «{delState.name}» será apagado da base e do disco. Se estiver referenciado em
                conteúdos, será pedida uma confirmação adicional.
              </AlertDialogDescription>
            ) : delState?.step === 2 ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Este ficheiro aparece nos dados abaixo. Remover na mesma pode deixar imagens ou
                  ligações partidas até editar esses conteúdos.
                </p>
                <ul className="max-h-40 list-inside list-disc space-y-1 overflow-y-auto rounded-md border border-border bg-muted/40 p-2 text-foreground">
                  {(delState.refs || []).slice(0, 20).map((r, i) => (
                    <li key={i}>{r.label}</li>
                  ))}
                </ul>
                {(delState.refs || []).length > 20 ? (
                  <p className="text-xs">… e mais {(delState.refs || []).length - 20} referência(s).</p>
                ) : null}
              </div>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={delSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={delSubmitting}
              onClick={() => runDelete(delState?.step === 2)}
            >
              {delSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : delState?.step === 2 ? (
                "Remover na mesma"
              ) : (
                "Remover"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

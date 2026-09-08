import { useCallback, useEffect, useMemo, useState } from "react";
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
  Video,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SOFT_DELETE_CONFIRM_DESCRIPTION } from "@/lib/softDeleteUi";
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

/** Imagem ou vídeo (por MIME) cuja pré-visualização falhou ao carregar no browser. */
function isImageOrVideoMime(mime) {
  const m = String(mime || "").toLowerCase();
  return m.startsWith("image/") || m.startsWith("video/");
}

function hasBrokenMediaPreview(row, previewFailedIds) {
  if (!previewFailedIds?.has(row?.id)) return false;
  return isImageOrVideoMime(row?.mime);
}

async function fetchAdminFiles({ skip, q, kind }) {
  const sp = new URLSearchParams();
  sp.set("limit", String(PAGE_SIZE));
  sp.set("skip", String(skip));
  if (q.trim()) sp.set("q", q.trim());
  if (kind && kind !== "all") sp.set("kind", kind);
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

async function restoreUploadsZip(file, onProgress) {
  await ensureCsrfCookieClient();
  const headers = await withCsrfHeaderAsync();
  const fd = new FormData();
  fd.append("file", file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/files/restore-zip");
    xhr.withCredentials = true;
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || typeof onProgress !== "function") return;
      onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      let body = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = { message: xhr.responseText };
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
        return;
      }
      const code = body?.message || xhr.statusText;
      const err = new Error(code);
      err.status = xhr.status;
      reject(err);
    };
    xhr.onerror = () => reject(new Error("upload_failed"));
    xhr.send(fd);
  });
}

function restoreZipErrorMessage(code) {
  const c = String(code || "");
  if (c === "zip_required") return "Envie um ficheiro .zip da pasta de uploads do servidor antigo.";
  if (c === "zip_too_large") return "O ZIP é demasiado grande. Tente um arquivo menor ou aumente ICER_RESTORE_ZIP_MAX_MB.";
  if (c === "zip_extract_failed") return "Não foi possível extrair o ZIP. Confirme que o ficheiro não está corrompido.";
  if (c === "upload_failed") return "Falha de rede ao enviar o ZIP.";
  return "Não foi possível restaurar os ficheiros.";
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
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [previewFailedIds, setPreviewFailedIds] = useState(() => new Set());
  /** Filtro de listagem: tipos via API; «broken» só oculta linhas na página atual. */
  const [listKindFilter, setListKindFilter] = useState("all");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restorePct, setRestorePct] = useState(0);

  const serverListKind = listKindFilter === "broken" ? "all" : listKindFilter;

  useEffect(() => {
    setPage(0);
  }, [listKindFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQDebounced(qInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const skip = page * PAGE_SIZE;
  const listQuery = useQuery({
    queryKey: ["admin-files", skip, qDebounced, serverListKind],
    queryFn: () => fetchAdminFiles({ skip, q: qDebounced, kind: serverListKind }),
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

  const displayItems = useMemo(() => {
    if (listKindFilter === "broken") {
      return items.filter((r) => hasBrokenMediaPreview(r, previewFailedIds));
    }
    return items;
  }, [items, listKindFilter, previewFailedIds]);

  const itemsIdKey = useMemo(() => items.map((r) => r.id).join(","), [items]);

  const markPreviewFailed = useCallback((id) => {
    setPreviewFailedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, qDebounced, itemsIdKey, listKindFilter]);

  useEffect(() => {
    setPreviewFailedIds(new Set());
  }, [page, qDebounced, itemsIdKey]);

  const brokenPreviewOnPage = useMemo(
    () => items.filter((r) => hasBrokenMediaPreview(r, previewFailedIds)).length,
    [items, previewFailedIds],
  );

  const selectedOnPageCount = useMemo(
    () => displayItems.filter((r) => selectedIds.has(r.id)).length,
    [displayItems, selectedIds],
  );
  const allPageSelected =
    displayItems.length > 0 && displayItems.every((r) => selectedIds.has(r.id));
  const pageHeaderCheckboxState = useMemo(() => {
    if (displayItems.length === 0) return false;
    if (allPageSelected) return true;
    if (selectedOnPageCount > 0) return "indeterminate";
    return false;
  }, [displayItems.length, allPageSelected, selectedOnPageCount]);

  const toggleRowSelected = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const setHeaderPageCheckbox = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) displayItems.forEach((r) => next.add(r.id));
      else displayItems.forEach((r) => next.delete(r.id));
      return next;
    });
  };

  const runRestoreZip = async (file) => {
    if (!file) return;
    setRestoreBusy(true);
    setRestorePct(0);
    try {
      const result = await restoreUploadsZip(file, setRestorePct);
      toast.success(
        `Restaurados ${result.written} ficheiro(s)${
          result.skipped ? ` · ${result.skipped} ignorado(s)` : ""
        }. Recarregue o site para ver as imagens.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-files"] });
    } catch (e) {
      toast.error(restoreZipErrorMessage(e?.message));
    } finally {
      setRestoreBusy(false);
      setRestorePct(0);
    }
  };

  const runBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    let inUse = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        try {
          await deleteAdminFileRequest(id, false);
          ok += 1;
        } catch (e) {
          if (e?.status === 409) inUse += 1;
          else failed += 1;
        }
      }
      if (ok > 0) toast.success(`${ok} ficheiro(s) removido(s).`);
      if (inUse > 0) {
        toast.warning(
          `${inUse} ficheiro(s) em uso — remova individualmente e use confirmação forçada quando aplicável.`,
        );
      }
      if (failed > 0) toast.error(`${failed} ficheiro(s) não foram removidos (erro).`);
      setSelectedIds(new Set());
      setDetailId((cur) =>
        cur != null && ids.some((id) => id === cur || String(id) === String(cur))
          ? null
          : cur,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-files"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-file-detail"] });
    } finally {
      setBulkBusy(false);
      setBulkOpen(false);
    }
  };

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
              Lista completa dos ficheiros registados na base. Para migrar de outro servidor,
              compacte a pasta de uploads num ZIP e envie abaixo — os nomes dos ficheiros têm de
              ser os mesmos.
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

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground">Restaurar pasta do VPS antigo</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No Windows: clique com o botão direito na pasta que descarregou → Enviar para → Pasta
          compactada (ZIP). Depois escolha esse .zip aqui.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            id="admin-restore-zip"
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            disabled={restoreBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void runRestoreZip(file);
            }}
          />
          <Button
            type="button"
            className="gap-2"
            disabled={restoreBusy}
            onClick={() => document.getElementById("admin-restore-zip")?.click()}
          >
            {restoreBusy ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {restoreBusy ? `A enviar… ${restorePct}%` : "Enviar ZIP"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar por nome ou tipo MIME…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            aria-label="Pesquisar ficheiros"
          />
        </div>
        <div className="grid shrink-0 gap-1.5 sm:min-w-[15rem]">
          <Label htmlFor="admin-files-type-filter" className="text-xs text-muted-foreground">
            Tipo de ficheiro
          </Label>
          <Select
            value={listKindFilter}
            onValueChange={(v) => setListKindFilter(v)}
          >
            <SelectTrigger id="admin-files-type-filter" className="h-10">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="image">Imagens</SelectItem>
              <SelectItem value="video">Vídeos</SelectItem>
              <SelectItem value="audio">Áudio</SelectItem>
              <SelectItem value="broken">Pré-visualização quebrada (nesta página)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="shrink-0 text-sm tabular-nums text-muted-foreground lg:pb-2">
          <p>{total} ficheiro(s) no total</p>
          {listKindFilter === "broken" && items.length > 0 ? (
            <p className="mt-0.5 text-xs font-normal text-foreground">
              {brokenPreviewOnPage} com erro nesta página · paginação inclui todos os tipos
            </p>
          ) : null}
        </div>
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
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Seleção nesta página
                </p>
                <p className="text-sm text-foreground">
                  <span className="tabular-nums font-semibold">{selectedIds.size}</span>{" "}
                  selecionado(s) no total
                  {selectedOnPageCount > 0 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · <span className="tabular-nums">{selectedOnPageCount}</span> visíveis aqui
                    </span>
                  ) : null}
                </p>
              </div>
              {selectedIds.size > 0 ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-9 w-full shrink-0 sm:w-auto"
                  onClick={() => setBulkOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover {selectedIds.size}
                </Button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedIds(new Set(displayItems.map((r) => r.id)))}
              >
                Selecionar todos (visíveis)
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">
              Use o filtro «Tipo de ficheiro» acima para imagens, vídeos, áudio ou pré-visualização
              falhada nesta página. Para limpar a seleção, desmarque no cabeçalho da tabela ou por
              linha.
            </p>
          </div>

          {/* Lista única (tabela): mesmas opções em qualquer largura — scroll horizontal em ecrãs estreitos. */}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                  <tr>
                    <th className="w-12 px-2 py-3 pl-3">
                      <Checkbox
                        checked={pageHeaderCheckboxState}
                        onCheckedChange={(v) => setHeaderPageCheckbox(v === true)}
                        aria-label="Selecionar todos os ficheiros desta página"
                      />
                    </th>
                    <th className="w-14 px-2 py-3"> </th>
                    <th className="px-3 py-3">Nome</th>
                    <th className="hidden px-3 py-3 lg:table-cell">MIME</th>
                    <th className="px-3 py-3">Tamanho</th>
                    <th className="hidden px-3 py-3 xl:table-cell">Criado</th>
                    <th className="min-w-[9.5rem] px-3 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-sm text-muted-foreground"
                      >
                        Nenhum ficheiro visível com o filtro atual — altere o tipo, a pesquisa ou a
                        página.
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((row) => {
                    const isImg = String(row.mime || "").startsWith("image/");
                    const isVid = String(row.mime || "").startsWith("video/");
                    const previewBroken = hasBrokenMediaPreview(row, previewFailedIds);
                    const sel = selectedIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-b border-border/70 last:border-0 hover:bg-muted/30",
                          sel && "bg-accent/5",
                          previewBroken && "bg-amber-500/[0.06]",
                        )}
                      >
                        <td className="px-2 py-2 pl-3 align-middle">
                          <Checkbox
                            checked={sel}
                            onCheckedChange={(v) => toggleRowSelected(row.id, Boolean(v))}
                            aria-label={`Selecionar ${row.original_name || row.id}`}
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          {isImg ? (
                            <img
                              src={`/api/files/${row.id}?w=64&format=webp`}
                              alt=""
                              className="h-10 w-10 rounded-md border border-border object-cover"
                              onError={() => markPreviewFailed(row.id)}
                            />
                          ) : isVid ? (
                            <span
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-md border",
                                previewBroken
                                  ? "border-amber-500/60 bg-amber-500/10"
                                  : "border-border bg-muted/50",
                              )}
                            >
                              <Video className="h-4 w-4 text-muted-foreground" aria-hidden />
                            </span>
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50">
                              <FileIcon className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                        </td>
                        <td className="max-w-[min(14rem,28vw)] px-3 py-2 align-middle">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            {previewBroken ? (
                              <span className="inline-flex w-fit items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-100">
                                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                                Pré-visualização quebrada
                              </span>
                            ) : null}
                            <span className="truncate font-mono text-xs text-foreground">
                              {row.original_name || `— (#${row.id})`}
                            </span>
                          </div>
                        </td>
                        <td className="hidden max-w-[200px] truncate px-3 py-2 align-middle font-mono text-xs text-muted-foreground lg:table-cell">
                          {row.mime || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 align-middle tabular-nums text-muted-foreground">
                          {formatBytes(row.size)}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 align-middle text-muted-foreground xl:table-cell">
                          {formatTs(row.created_at)}
                        </td>
                        <td className="px-2 py-2 text-right align-middle">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-2 text-xs"
                              onClick={() => setDetailId(row.id)}
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Ver
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() =>
                                openDelete(row.id, row.original_name || `#${row.id}`)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Apagar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vídeos: elemento invisível para detetar erro ao carregar o ficheiro (miniatura não existe na lista). */}
          <div className="sr-only" aria-hidden="true">
            {items.map((row) => {
              if (!String(row.mime || "").startsWith("video/")) return null;
              return (
                <video
                  key={`probe-video-${row.id}`}
                  src={`/api/files/${row.id}`}
                  muted
                  playsInline
                  preload="metadata"
                  onError={() => markPreviewFailed(row.id)}
                />
              );
            })}
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
                «{delState.name}» deixa de estar disponível no site. Se estiver referenciado em
                conteúdos, será pedida uma confirmação adicional. {SOFT_DELETE_CONFIRM_DESCRIPTION}
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

      <AlertDialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open && !bulkBusy) setBulkOpen(false);
        }}
      >
        <AlertDialogContent className="z-[100] max-w-[min(calc(100vw-2rem),28rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ficheiros selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão marcados para remoção{" "}
              <span className="font-semibold tabular-nums text-foreground">{selectedIds.size}</span>{" "}
              ficheiro(s). Ficheiros em uso não serão removidos neste passo em massa — trate-os
              individualmente quando aplicável. {SOFT_DELETE_CONFIRM_DESCRIPTION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel type="button" disabled={bulkBusy} className="mt-0">
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={bulkBusy || selectedIds.size === 0}
              onClick={() => runBulkDelete()}
            >
              {bulkBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Remover selecionados"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

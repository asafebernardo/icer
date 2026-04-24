import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, MapPin, Star, X } from "lucide-react";
import { listEventosMerged } from "@/lib/eventosQuery";
import { getSiteConfig } from "@/lib/siteConfig";
import {
  PUBLIC_WORKSPACE_QUERY_KEY,
  fetchPublicWorkspaceJson,
  postDismissDestaqueEvento,
  shouldUseRemotePublicWorkspace,
} from "@/lib/publicWorkspace";
import { hydrateMemberRegistryFromPublicWorkspace } from "@/lib/memberRegistry";
import { eventCardBarClass } from "@/lib/eventCardColors";
import { CATEGORY_BAR_CLASS } from "@/lib/categoryAppearance";

const categoriaBg = CATEGORY_BAR_CLASS;

function getDestaqueId() {
  return String(getSiteConfig().eventoDestaqueId || "").trim();
}

function getDestaqueSessionKey(id) {
  const sid = String(id || "").trim();
  return sid ? `icer_event_destaque_closed:${sid}` : "icer_event_destaque_closed:";
}

function isDestaquePopupDismissed(destaqueId, publicWs, localDismissTick) {
  const sid = String(destaqueId || "").trim();
  if (!sid) return true;
  if (shouldUseRemotePublicWorkspace()) {
    const ids = publicWs?.evento_destaque_dismissed_ids;
    return Array.isArray(ids) && ids.includes(sid);
  }
  try {
    return sessionStorage.getItem(getDestaqueSessionKey(sid)) === "1";
  } catch {
    return true;
  } finally {
    void localDismissTick;
  }
}

export default function DestaqueEventoGlobal() {
  const location = useLocation();
  const queryClient = useQueryClient();

  // Excluir áreas administrativas (Dashboard) para não gerar spam em admin.
  const isAdminArea = location.pathname.startsWith("/Dashboard");
  const [destaqueId, setDestaqueId] = useState(getDestaqueId);
  const [localDismissTick, setLocalDismissTick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setDestaqueId(getDestaqueId());
    sync();
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  const useRemoteWs = shouldUseRemotePublicWorkspace();
  const { data: publicWs } = useQuery({
    queryKey: PUBLIC_WORKSPACE_QUERY_KEY,
    queryFn: fetchPublicWorkspaceJson,
    enabled: useRemoteWs,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (useRemoteWs && publicWs) hydrateMemberRegistryFromPublicWorkspace(publicWs);
  }, [useRemoteWs, publicWs]);

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
    staleTime: 30_000,
  });

  const destaqueEvento = useMemo(
    () => (eventos || []).find((e) => String(e?.id) === String(destaqueId)),
    [eventos, destaqueId],
  );

  useEffect(() => {
    if (isAdminArea) {
      setOpen(false);
      return;
    }
    const id = String(destaqueId || "").trim();
    if (!id || !destaqueEvento) {
      setOpen(false);
      return;
    }
    const closed = isDestaquePopupDismissed(id, publicWs, localDismissTick);
    setOpen(!closed);
  }, [destaqueId, destaqueEvento, publicWs, localDismissTick, isAdminArea]);

  const closeForSession = async () => {
    const id = String(destaqueId || "").trim();
    if (id) {
      if (shouldUseRemotePublicWorkspace()) {
        try {
          await postDismissDestaqueEvento(id);
          await queryClient.invalidateQueries({ queryKey: PUBLIC_WORKSPACE_QUERY_KEY });
        } catch {
          /* falha de rede: fecha na mesma */
        }
      } else {
        try {
          sessionStorage.setItem(getDestaqueSessionKey(id), "1");
        } catch {
          /* ignore */
        }
        setLocalDismissTick((t) => t + 1);
      }
    }
    setOpen(false);
  };

  if (isAdminArea) return null;
  if (!destaqueEvento) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) void closeForSession();
        else setOpen(true);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-accent fill-accent" />
              Cadastro de evento
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeForSession}
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {(() => {
          const date = destaqueEvento.data ? parseISO(destaqueEvento.data) : null;
          const bar = eventCardBarClass(destaqueEvento, categoriaBg);
          return (
            <div className="space-y-4">
              <Link to={`/Evento/${destaqueEvento.id}`} onClick={closeForSession}>
                <motion.div
                  whileHover={{ y: -1 }}
                  className="group rounded-2xl overflow-hidden border border-accent/50 bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`h-2 ${bar}`} />
                  <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                    {date ? (
                      <div className={`shrink-0 w-16 h-16 rounded-2xl text-white flex flex-col items-center justify-center shadow ${bar}`}>
                        <span className="text-2xl font-bold leading-none">
                          {format(date, "d")}
                        </span>
                        <span className="text-[10px] font-semibold uppercase">
                          {format(date, "MMM", { locale: ptBR })}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-accent transition-colors">
                        {destaqueEvento.titulo}
                      </h2>
                      {destaqueEvento.descricao ? (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                          {destaqueEvento.descricao}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                        {destaqueEvento.horario ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-accent" />
                            {destaqueEvento.horario}
                          </span>
                        ) : null}
                        {destaqueEvento.local ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-accent" />
                            {destaqueEvento.local}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition-colors group-hover:bg-background">
                        Ver detalhes
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}


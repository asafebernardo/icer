import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { listEventosMerged } from "@/lib/eventosQuery";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  MapPin,
  Mic2,
  User,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ResponsivePageBgImage from "@/components/shared/ResponsivePageBgImage";
import AdminPageBgButton from "@/components/shared/AdminPageBgButton";
import { usePageBackground } from "@/lib/usePageBackground";
import EventoFormPanel from "@/components/agenda/EventoFormPanel";
import { ProgramIcon } from "@/components/agenda/programIcons";
import {
  PROGRAM_PERIOD_ORDER,
  groupProgramItensByPeriod,
} from "@/lib/eventPeriod";
import { eventCardBarClass } from "@/lib/eventCardColors";
import { useAuth } from "@/lib/AuthContext";
import { canEditPageBackground, canMenuAction, MENU } from "@/lib/auth";
import { imageScrimFlat, imageScrimBottom } from "@/lib/imageScrimClasses";
import { CATEGORY_BAR_CLASS } from "@/lib/categoryAppearance";

const categoriaLabels = {
  culto: "Culto",
  estudo: "Estudo",
  jovens: "Jovens",
  mulheres: "Mulheres",
  homens: "Homens",
  criancas: "Crianças",
  especial: "Especial",
  conferencia: "Conferência",
};

/** Banner sem imagem — superfície institucional */
const BANNER_FALLBACK_CLASS =
  "bg-gradient-to-r from-brand-surface via-brand-surface to-brand-surface/90";

const categoriaColorsBg = CATEGORY_BAR_CLASS;

export default function EventoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEditEvento = canMenuAction(user, MENU.EVENTOS, "edit");
  const canEditBanner = canEditPageBackground(user, "evento");
  const { url: bannerBgUrl, handleFile, applyUrl } = usePageBackground("evento");
  const [diaAtivo, setDiaAtivo] = useState(null);
  const [editing, setEditing] = useState(false);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
  });

  const evento = eventos.find((e) => String(e.id) === String(id));
  const canEditOnPage = Boolean(canEditEvento && evento);

  const programacaoDias = useMemo(() => {
    if (!evento) return [];
    const dias = Array.isArray(evento.programacao) ? evento.programacao : [];
    return dias.map((d) => ({
      ...d,
      itens: Array.isArray(d.itens) ? d.itens : [],
    }));
  }, [evento]);

  const diaSelecionado = useMemo(() => {
    if (!programacaoDias.length) return null;
    const current =
      diaAtivo != null
        ? programacaoDias.find((d) => d.id === diaAtivo) || null
        : null;
    return current || programacaoDias[0];
  }, [programacaoDias, diaAtivo]);

  const date = evento?.data ? parseISO(evento.data) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Evento não encontrado.</p>
        <Link to="/Agenda">
          <Button variant="outline">Ver Agenda</Button>
        </Link>
      </div>
    );
  }

  const barColor = eventCardBarClass(evento, categoriaColorsBg);

  return (
    <div className="min-h-screen bg-background">
      {/* Banner topo */}
      <div
        className={`py-16 px-4 relative overflow-hidden min-h-[200px] sm:min-h-[260px] ${bannerBgUrl ? "" : BANNER_FALLBACK_CLASS}`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 z-30 pointer-events-none ${barColor}`}
          aria-hidden
        />
        {bannerBgUrl ? (
          <>
            <ResponsivePageBgImage src={bannerBgUrl} />
            <div className={imageScrimFlat} aria-hidden />
            <div className={imageScrimBottom} aria-hidden />
          </>
        ) : (
          <>
            <div className={`absolute inset-0 ${BANNER_FALLBACK_CLASS}`} />
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_white,_transparent)] pointer-events-none" />
          </>
        )}
        <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2 justify-end max-w-[calc(100%-2rem)]">
          {canEditOnPage && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shadow-md gap-1.5"
              onClick={() => {
                if (editing) {
                  setEditing(false);
                  navigate("/Eventos?todos=1");
                } else {
                  setEditing(true);
                }
              }}
            >
              <Pencil className="w-4 h-4" />
              {editing ? "Fechar edição" : "Editar evento"}
            </Button>
          )}
          <AdminPageBgButton
            visible={canEditBanner}
            onSelectFile={handleFile}
            onClear={() => applyUrl("")}
            hasBackground={Boolean((bannerBgUrl || "").trim())}
            className="relative"
          />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 text-white">
          <Link
            to="/Agenda"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/90 transition-colors hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para a agenda
          </Link>
          {evento.categoria && (
            <span className="mb-4 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
              {categoriaLabels[evento.categoria] || evento.categoria}
            </span>
          )}
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {evento.titulo}
          </h1>
          {date && (
            <p className="mt-3 text-lg text-white/90">
              {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {canEditOnPage ? (
          <EventoFormPanel
            open={editing}
            evento={evento}
            onCancel={() => {
              setEditing(false);
              navigate("/Eventos?todos=1");
            }}
            onSaved={() => setEditing(false)}
            onDeleted={() => navigate("/Eventos?todos=1")}
          />
        ) : null}

        {!editing && (
        <div className="space-y-8 max-w-3xl">
            {canEditOnPage ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="w-4 h-4" />
                  Editar evento
                </Button>
              </div>
            ) : null}
            {/* Detalhes */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-bold text-foreground text-lg">
                Detalhes do Evento
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {date && (
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white ${barColor}`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
                {evento.horario && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="text-sm font-semibold text-foreground">
                        {evento.horario}
                        {evento.horario_fim ? ` – ${evento.horario_fim}` : ""}
                      </p>
                    </div>
                  </div>
                )}
                {evento.local && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Local</p>
                      <p className="text-sm font-semibold text-foreground">
                        {evento.local}
                      </p>
                    </div>
                  </div>
                )}
                {evento.preletor && (
                  <div className="flex items-start gap-3">
                    {evento.preletor_avatar_url ? (
                      <img
                        src={evento.preletor_avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-border bg-muted shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Mic2 className="w-4 h-4 text-accent" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Preletor</p>
                      <p className="text-sm font-semibold text-foreground">
                        {evento.preletor}
                      </p>
                    </div>
                  </div>
                )}
                {evento.pastor && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Presbítero</p>
                      <p className="text-sm font-semibold text-foreground">
                        {evento.pastor}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {evento.descricao && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {evento.descricao}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Programação (dias em abas) */}
            {programacaoDias.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 space-y-4"
              >
                <h2 className="font-bold text-foreground text-lg">
                  Programação
                </h2>

                <div className="flex flex-wrap gap-2">
                  {programacaoDias.map((d) => {
                    const active = diaSelecionado?.id === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDiaAtivo(d.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          active
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        }`}
                      >
                        {d.titulo || "Dia"}
                      </button>
                    );
                  })}
                </div>

                {diaSelecionado?.itens?.length ? (
                  <div className="space-y-5">
                    {PROGRAM_PERIOD_ORDER.map((period) => {
                      const buckets = groupProgramItensByPeriod(
                        diaSelecionado.itens,
                      );
                      const rowItems = buckets[period.key];
                      if (!rowItems.length) return null;
                      return (
                        <div key={period.key} className="space-y-2">
                          <p
                            className={`text-[11px] font-bold uppercase tracking-wide pb-1.5 ${period.headingClass}`}
                          >
                            {period.label}
                          </p>
                          <div className="space-y-2">
                            {rowItems.map((it) => (
                              <div
                                key={it.id}
                                className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
                              >
                                <div className="flex items-center gap-2 shrink-0">
                                  <ProgramIcon
                                    name={it.icone || "Clock"}
                                    className="h-5 w-5 text-accent shrink-0"
                                  />
                                  <p className="text-sm font-semibold text-foreground tabular-nums">
                                    {it.hora || "—"}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-foreground min-w-0 flex-1">
                                  {it.titulo || "Atividade"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum horário cadastrado para este dia.
                  </p>
                )}
              </motion.div>
            )}
        </div>
        )}
      </div>
    </div>
  );
}

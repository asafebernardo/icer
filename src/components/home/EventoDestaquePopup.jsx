import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { format, parseISO, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, MapPin, ArrowRight, Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listEventosMerged } from "@/lib/eventosQuery";
import { eventCardBarClass } from "@/lib/eventCardColors";
import { CATEGORY_BAR_CLASS } from "@/lib/categoryAppearance";

const categoriaBg = CATEGORY_BAR_CLASS;

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

export default function EventoDestaquePopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
  });

  const futuros = eventos
    .filter((e) => e.data && isFuture(parseISO(e.data + "T23:59:59")))
    .sort((a, b) => a.data.localeCompare(b.data));

  const destaque =
    futuros.find((e) => e.destaque) ||
    futuros.find(
      (e) => e.categoria === "especial" || e.categoria === "conferencia",
    ) ||
    futuros[0];

  useEffect(() => {
    if (!destaque || dismissed) return;
    // Mostra o popup 1.5s após carregar
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, [destaque, dismissed]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!destaque) return null;

  const date = parseISO(destaque.data);
  const barColor = eventCardBarClass(destaque, categoriaBg);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden">
              <div className={`h-1.5 w-full ${barColor}`} />
              {/* Degradê preto/cinza (não segue cor do evento) */}
              <div className="relative bg-gradient-to-r from-primary via-primary to-primary/90 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/85">
                    Evento em Destaque
                  </span>
                </div>
                <h2 className="pr-8 font-display text-2xl font-bold leading-snug text-primary-foreground">
                  {destaque.titulo}
                </h2>
                {destaque.categoria && (
                  <span className="mt-2 inline-block rounded-full bg-primary-foreground/20 px-2.5 py-1 text-xs font-bold text-primary-foreground">
                    {categoriaLabels[destaque.categoria] || destaque.categoria}
                  </span>
                )}
                {/* Imagem de fundo semi-transparente */}
                {destaque.imagem_url && (
                  <div
                    className="absolute inset-0 opacity-20 bg-cover bg-center"
                    style={{ backgroundImage: `url(${destaque.imagem_url})` }}
                  />
                )}
                {destaque.preletor_avatar_url && (
                  <img
                    src={destaque.preletor_avatar_url}
                    alt=""
                    className="absolute right-4 bottom-4 h-14 w-14 rounded-full object-cover border border-primary-foreground/25 bg-muted shadow-lg"
                    loading="lazy"
                  />
                )}
                <button
                  onClick={dismiss}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-primary-foreground transition-colors hover:bg-primary-foreground/15"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {destaque.descricao && (
                  <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                    {destaque.descricao}
                  </p>
                )}

                <div className="flex flex-col gap-2.5 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent shrink-0" />
                    {format(date, "EEEE, d 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                  {destaque.horario && (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent shrink-0" />
                      {destaque.horario}
                      {destaque.horario_fim ? ` – ${destaque.horario_fim}` : ""}
                    </span>
                  )}
                  {destaque.local && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent shrink-0" />
                      {destaque.local}
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <Link
                    to={`/Evento/${destaque.id}`}
                    onClick={dismiss}
                    className="flex-1"
                  >
                    <button
                      type="button"
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 ${barColor}`}
                    >
                      Ver detalhes <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={dismiss}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { useQuery } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { format, parseISO, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, MapPin, ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { listEventosMerged } from "@/lib/eventosQuery";
import { eventCardBarClass } from "@/lib/eventCardColors";

const categoriaBg = {
  culto: "bg-blue-600",
  estudo: "bg-green-600",
  jovens: "bg-purple-600",
  mulheres: "bg-pink-500",
  homens: "bg-orange-500",
  criancas: "bg-yellow-500",
  especial: "bg-red-600",
  conferencia: "bg-indigo-600",
};

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

const categoriaLight = {
  culto: "bg-blue-50 text-blue-700 border-blue-200",
  estudo: "bg-green-50 text-green-700 border-green-200",
  jovens: "bg-purple-50 text-purple-700 border-purple-200",
  mulheres: "bg-pink-50 text-pink-700 border-pink-200",
  homens: "bg-orange-50 text-orange-700 border-orange-200",
  criancas: "bg-yellow-50 text-yellow-700 border-yellow-200",
  especial: "bg-red-50 text-red-700 border-red-200",
  conferencia: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function EventoDestaque() {
  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos"],
    queryFn: listEventosMerged,
  });

  // Pega o próximo evento futuro com categoria 'especial' ou 'conferencia', senão o próximo evento qualquer
  const agora = new Date();
  const futuros = eventos
    .filter((e) => e.data && isFuture(parseISO(e.data + "T23:59:59")))
    .sort((a, b) => a.data.localeCompare(b.data));

  const destaque =
    futuros.find((e) => e.destaque) ||
    futuros.find(
      (e) => e.categoria === "especial" || e.categoria === "conferencia",
    ) ||
    futuros[0];

  if (!destaque) return null;

  const date = parseISO(destaque.data);
  const barColor = eventCardBarClass(destaque, categoriaBg);

  return (
    <section className="py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-5">
          <Star className="w-4 h-4 text-accent fill-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-accent">
            Evento em Destaque
          </span>
        </div>

        <Link to={`/Evento/${destaque.id}`}>
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="group bg-card border border-border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className={`h-1.5 w-full ${barColor}`} />
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {/* Data destacada */}
              <div
                className={`shrink-0 w-20 h-20 rounded-2xl text-white flex flex-col items-center justify-center shadow-lg ${barColor}`}
              >
                <span className="text-3xl font-bold leading-none">
                  {format(date, "d")}
                </span>
                <span className="text-xs font-semibold uppercase mt-1">
                  {format(date, "MMM", { locale: ptBR })}
                </span>
                <span className="text-xs opacity-80">
                  {format(date, "yyyy")}
                </span>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                {destaque.categoria && (
                  <span
                    className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mb-3 ${categoriaLight[destaque.categoria] || "bg-muted text-muted-foreground"}`}
                  >
                    {categoriaLabels[destaque.categoria] || destaque.categoria}
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-accent transition-colors leading-snug">
                  {destaque.titulo}
                </h2>
                {destaque.descricao && (
                  <p className="text-muted-foreground text-sm mt-1.5 line-clamp-2">
                    {destaque.descricao}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-accent" />
                    {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                  {destaque.horario && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-accent" />
                      {destaque.horario}
                      {destaque.horario_fim ? ` – ${destaque.horario_fim}` : ""}
                    </span>
                  )}
                  {destaque.local && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-accent" />
                      {destaque.local}
                    </span>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="shrink-0">
                <span className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-sm font-semibold px-5 py-2.5 rounded-xl group-hover:bg-accent/90 transition-colors">
                  Ver detalhes <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </motion.div>
        </Link>
      </div>
    </section>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

const categoriaLabels = {
  culto: "Culto",
  evento: "Evento",
  jovens: "Jovens",
  missoes: "Missões",
  outros: "Outros",
};

function getYear(dateStr) {
  if (!dateStr) return null;
  const y = new Date(dateStr).getFullYear();
  return Number.isFinite(y) ? y : null;
}

export default function GaleriaPorAno() {
  const [selected, setSelected] = useState(null);
  const [expandedYears, setExpandedYears] = useState({});

  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ["galeria"],
    queryFn: () => api.entities.FotoGaleria.list("-created_date", 100),
  });

  const lista = Array.isArray(fotos) ? fotos : [];

  const byYear = {};
  lista.forEach((foto) => {
    const year = getYear(foto.created_date);
    if (year == null) return;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(foto);
  });
  const years = Object.keys(byYear).sort((a, b) => b - a);

  const toggleYear = (year) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  const isExpanded = (year) => expandedYears[year] !== false;

  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-accent font-semibold text-sm tracking-wider uppercase">
            Nossa comunidade
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-3">
            Galeria de Fotos
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Momentos especiais da nossa caminhada ao longo dos anos.
          </p>
        </motion.div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">A carregar…</p>
        ) : years.length === 0 ? (
          <p className="text-center text-muted-foreground py-16 max-w-md mx-auto">
            Ainda não há fotografias na galeria ou não têm data associada para
            agrupar por ano.
          </p>
        ) : (
          years.map((year) => (
            <div key={year} className="mb-10">
              <button
                type="button"
                onClick={() => toggleYear(year)}
                className="flex items-center gap-3 w-full mb-5 group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl font-bold text-foreground">
                    {year}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {byYear[year].length} foto
                    {byYear[year].length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform group-hover:text-foreground ${isExpanded(year) ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isExpanded(year) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {byYear[year].map((foto, i) => (
                        <motion.div
                          key={foto.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.05 }}
                          className={`relative group cursor-pointer overflow-hidden rounded-xl aspect-square ${i === 0 ? "col-span-2 row-span-2 aspect-auto" : ""}`}
                          style={i === 0 ? { aspectRatio: "1/1" } : {}}
                          onClick={() => setSelected(foto)}
                        >
                          <img
                            src={foto.imagem_url}
                            alt={foto.titulo || ""}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-end p-3">
                            <div className="translate-y-2 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                              <span className="text-white text-xs font-semibold block">
                                {foto.titulo}
                              </span>
                              {foto.categoria && (
                                <span className="text-white/70 text-xs capitalize">
                                  {categoriaLabels[foto.categoria] ||
                                    foto.categoria}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-white/80 hover:text-white"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="text-center" onClick={(e) => e.stopPropagation()}>
              <motion.img
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.85 }}
                src={selected.imagem_url}
                alt={selected.titulo}
                className="max-w-3xl max-h-[80vh] object-contain rounded-xl shadow-2xl mx-auto"
              />
              {selected.titulo && (
                <p className="text-white mt-3 font-semibold">
                  {selected.titulo}
                </p>
              )}
              {selected.created_date && (
                <p className="text-white/50 text-sm mt-1">
                  {getYear(selected.created_date)}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

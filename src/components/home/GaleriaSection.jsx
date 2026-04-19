import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const categoriaLabels = {
  culto: "Culto",
  evento: "Evento",
  jovens: "Jovens",
  missoes: "Missões",
  outros: "Outros",
};

export default function GaleriaSection() {
  const [selected, setSelected] = useState(null);

  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ["galeria"],
    queryFn: () => api.entities.FotoGaleria.list("-created_date", 12),
  });

  const lista = Array.isArray(fotos) ? fotos : [];

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
            Momentos especiais da nossa caminhada juntos em fé.
          </p>
        </motion.div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">A carregar…</p>
        ) : lista.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 max-w-md mx-auto">
            Ainda não há fotografias na galeria. Quando forem adicionadas na
            administração, aparecerão aqui.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {lista.slice(0, 6).map((foto, i) => (
              <motion.div
                key={foto.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`relative group cursor-pointer overflow-hidden rounded-xl
                ${i === 0 ? "col-span-2 sm:col-span-2 row-span-1 aspect-video" : "aspect-square"}
              `}
                onClick={() => setSelected(foto)}
              >
                <img
                  src={foto.imagem_url}
                  alt={foto.titulo || ""}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-end p-4">
                  <div className="translate-y-2 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                    <span className="text-white text-sm font-semibold block">
                      {foto.titulo}
                    </span>
                    {foto.categoria && (
                      <span className="text-white/70 text-xs mt-0.5 block capitalize">
                        {categoriaLabels[foto.categoria] || foto.categoria}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
            <button className="absolute top-4 right-4 text-white/80 hover:text-white">
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              src={selected.imagem_url}
              alt={selected.titulo}
              className="max-w-3xl max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

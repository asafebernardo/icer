import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function CtaSection() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
      </div>
      <div className="max-w-3xl w-full min-w-0 mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground mb-6">
            Faça parte da nossa família
          </h2>
          <p className="text-primary-foreground/88 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Estamos aqui para acolher você. Entre em contato ou confira nossa
            agenda de eventos.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/Contato">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-8 h-12 text-base font-semibold"
              >
                Fale Conosco
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/Agenda">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 rounded-xl px-8 h-12 text-base font-semibold"
              >
                Ver Agenda
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

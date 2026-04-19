import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Mic2, UserRound, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const categoriaColors = {
  culto: "bg-blue-100 text-blue-700",
  estudo: "bg-green-100 text-green-700",
  jovens: "bg-purple-100 text-purple-700",
  mulheres: "bg-pink-100 text-pink-700",
  homens: "bg-orange-100 text-orange-700",
  criancas: "bg-yellow-100 text-yellow-700",
  especial: "bg-red-100 text-red-700",
  conferencia: "bg-indigo-100 text-indigo-700",
};

export default function EventoDetailModal({
  evento,
  onClose,
  onEdit,
  isAdmin,
}) {
  if (!evento) return null;
  const date = evento.data ? parseISO(evento.data) : null;

  return (
    <Dialog open={!!evento} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-xl leading-snug">
              {evento.titulo}
            </DialogTitle>
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {evento.categoria && (
            <Badge
              className={`${categoriaColors[evento.categoria]} border-0 text-xs`}
            >
              {categoriaLabels[evento.categoria] || evento.categoria}
            </Badge>
          )}

          {date && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-bold leading-none">
                  {format(date, "d")}
                </span>
                <span className="text-xs uppercase font-medium">
                  {format(date, "MMM", { locale: ptBR })}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {format(date, "EEEE, d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
                {(evento.horario || evento.horario_fim) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    {evento.horario}
                    {evento.horario_fim ? ` – ${evento.horario_fim}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {evento.local && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0 text-accent" />
              {evento.local}
            </p>
          )}

          {(evento.preletor || evento.pastor) && (
            <div className="flex flex-col gap-2 border border-border rounded-xl p-3">
              {evento.preletor && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
                    <Mic2 className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Preletor</p>
                    <p className="text-sm font-semibold text-foreground">
                      {evento.preletor}
                    </p>
                  </div>
                </div>
              )}
              {evento.pastor && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                    <UserRound className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pastor</p>
                    <p className="text-sm font-semibold text-foreground">
                      {evento.pastor}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {evento.descricao && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {evento.descricao}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

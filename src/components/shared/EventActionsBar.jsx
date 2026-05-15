import { useState } from "react";
import { CalendarPlus, Download, MessageCircle, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildGoogleCalendarUrl,
  downloadIcs,
  buildShareWhatsapp,
  getEventoStartEnd,
} from "@/lib/calendar";

/**
 * Barra de ações para um evento: adicionar ao Google Calendar, baixar .ics,
 * partilhar no WhatsApp e copiar o link.
 */
export default function EventActionsBar({ evento }) {
  const [copied, setCopied] = useState(false);
  const dateOk = !!getEventoStartEnd(evento);
  const pageUrl =
    typeof window !== "undefined" ? window.location.href : undefined;

  const onCopy = async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {dateOk ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="gap-2"
          title="Adicionar ao Google Calendar"
        >
          <a
            href={buildGoogleCalendarUrl(evento)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Google Calendar</span>
          </a>
        </Button>
      ) : null}
      {dateOk ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            if (!downloadIcs(evento)) {
              toast.error("Não foi possível gerar o ficheiro.");
            }
          }}
          title="Baixar arquivo .ics (Apple/Outlook)"
        >
          <Download className="w-4 h-4" />
          <span>.ics</span>
        </Button>
      ) : null}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="gap-2"
        title="Partilhar no WhatsApp"
      >
        <a
          href={buildShareWhatsapp(evento, pageUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={onCopy}
        title="Copiar link"
      >
        {copied ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <LinkIcon className="w-4 h-4" />
        )}
        <span>{copied ? "Copiado" : "Copiar link"}</span>
      </Button>
    </div>
  );
}

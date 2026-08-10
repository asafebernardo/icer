import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import HistoryEventDetail from "@/components/historia/history/HistoryEventDetail";
import HistoryNavigation from "@/components/historia/history/HistoryNavigation";
import {
  getTimelineEventById,
  getTimelineEventIndex,
  TIMELINE_EVENTS,
} from "@/components/historia/history/timelineData";

export default function HistoriaEventoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = id ? getTimelineEventById(id) : undefined;
  const index = id ? getTimelineEventIndex(id) : -1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    if (index < 0) return undefined;

    const onKeyDown = (e) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA")
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (index > 0) {
            navigate(`/Historia/${TIMELINE_EVENTS[index - 1].id}`);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (index < TIMELINE_EVENTS.length - 1) {
            navigate(`/Historia/${TIMELINE_EVENTS[index + 1].id}`);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, navigate]);

  if (!event || index < 0) {
    return <Navigate to="/Historia" replace />;
  }

  const goPrev = () => {
    if (index > 0) navigate(`/Historia/${TIMELINE_EVENTS[index - 1].id}`);
  };

  const goNext = () => {
    if (index < TIMELINE_EVENTS.length - 1) {
      navigate(`/Historia/${TIMELINE_EVENTS[index + 1].id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="relative mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10 lg:max-w-6xl">
        <Link
          to="/Historia"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Voltar à timeline
        </Link>

        <HistoryEventDetail event={event} />

        <div className="mt-8 border-t border-border pt-6 sm:mt-10 sm:pt-8">
          <HistoryNavigation
            onPrev={goPrev}
            onNext={goNext}
            canPrev={index > 0}
            canNext={index < TIMELINE_EVENTS.length - 1}
            current={index + 1}
            total={TIMELINE_EVENTS.length}
          />
        </div>
      </section>
    </div>
  );
}

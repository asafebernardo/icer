import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  List,
  MapPin,
  Maximize2,
  Minimize2,
} from "lucide-react";

import HistoryImage from "@/components/historia/history/HistoryImage";
import { TIMELINE_EVENTS } from "@/components/historia/history/timelineData";
import {
  CATEGORY_COLORS,
  formatEventYear,
  type TimelineEvent,
  type TimelineImage,
} from "@/components/historia/history/types";
import { cn } from "@/lib/utils";

const INTRO_BG_IMAGE = "/images/historia/mapa-mundo.jpg";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
  }),
};

function getSlideExcerpt(event: TimelineEvent) {
  const paragraphs = event.content.split(/\n\n+/).filter(Boolean);
  const combined = paragraphs.slice(0, 2).join("\n\n");
  if (!combined) return event.summary;
  if (combined.length <= 520) return combined;
  return `${combined.slice(0, 517).trim()}…`;
}

/** Escolhe imagem variada por slide e define se a imagem fica à esquerda. */
function buildPresentationSlides(events: TimelineEvent[]) {
  const recentSrcs: string[] = [INTRO_BG_IMAGE];
  const RECENT_WINDOW = 6;
  const images: (TimelineImage | null)[] = [];
  const imageOnLeft: boolean[] = [];
  const lastLayoutBySrc = new Map<string, boolean>();

  events.forEach((event, eventIndex) => {
    if (event.images.length === 0) {
      images.push(null);
      imageOnLeft.push(eventIndex % 2 === 0);
      return;
    }

    const notRecent = event.images.filter((img) => !recentSrcs.includes(img.src));
    const picked =
      notRecent[0] ??
      event.images[eventIndex % event.images.length] ??
      event.images[0];

    const defaultLeft = eventIndex % 2 === 0;
    const forcedRepeat = notRecent.length === 0 && recentSrcs.includes(picked.src);
    const lastLayout = lastLayoutBySrc.get(picked.src);
    const onLeft =
      forcedRepeat && lastLayout !== undefined ? !lastLayout : defaultLeft;

    images.push(picked);
    imageOnLeft.push(onLeft);
    lastLayoutBySrc.set(picked.src, onLeft);

    recentSrcs.push(picked.src);
    if (recentSrcs.length > RECENT_WINDOW) recentSrcs.shift();
  });

  return { images, imageOnLeft };
}

const { images: PRESENTATION_IMAGES, imageOnLeft: PRESENTATION_IMAGE_ON_LEFT } =
  buildPresentationSlides(TIMELINE_EVENTS);

interface SlideBackgroundProps {
  image?: TimelineImage | null;
  accent?: string;
  glow?: string;
  bg?: string;
  children: ReactNode;
}

function SlideBackground({
  image,
  accent,
  glow,
  bg,
  children,
}: SlideBackgroundProps) {
  return (
    <div className="relative h-full overflow-hidden">
      {image ? (
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-[0.22] blur-lg saturate-[0.85]"
          style={{ backgroundImage: `url(${image.src})` }}
          aria-hidden
        />
      ) : null}

      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background: accent
            ? `radial-gradient(ellipse 85% 70% at 15% 15%, ${glow ?? accent} 0%, transparent 58%), radial-gradient(ellipse 70% 60% at 85% 85%, ${bg ?? accent} 0%, transparent 52%), linear-gradient(145deg, hsl(var(--card) / 0.55) 0%, hsl(var(--background) / 0.75) 100%)`
            : "radial-gradient(ellipse 80% 65% at 50% 15%, hsl(var(--primary) / 0.18) 0%, transparent 58%), linear-gradient(160deg, hsl(var(--muted) / 0.45) 0%, hsl(var(--card) / 0.92) 100%)",
        }}
      />

      <div
        className="absolute inset-0 bg-gradient-to-br from-background/55 via-card/75 to-card/95"
        aria-hidden
      />

      <div className="relative z-[1] h-full">{children}</div>
    </div>
  );
}

function IntroSlide() {
  const first = TIMELINE_EVENTS[0];
  const last = TIMELINE_EVENTS[TIMELINE_EVENTS.length - 1];

  return (
    <SlideBackground
      image={{ src: INTRO_BG_IMAGE, alt: "Mapa histórico — presença global" }}
      accent="hsl(var(--primary))"
    >
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center sm:px-12 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-sm">
          Apresentação histórica
        </p>
        <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Movimento dos Irmãos
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-xl sm:leading-relaxed">
          Uma visão resumida da história do movimento, do nascimento de Antony
          Norris Groves até a presença global de hoje.
        </p>
        {first && last ? (
          <p className="mt-8 font-display text-3xl font-bold tabular-nums text-primary sm:mt-10 sm:text-4xl lg:text-5xl">
            {formatEventYear(first)}
            <span className="mx-4 text-muted-foreground/40">→</span>
            {formatEventYear(last)}
          </p>
        ) : null}
        <p className="mt-auto pt-10 text-sm text-muted-foreground sm:text-base">
          {TIMELINE_EVENTS.length} momentos · use as setas ou a barra de espaço para avançar
        </p>
      </div>
    </SlideBackground>
  );
}

function EventSlide({
  event,
  image,
  imageOnLeft,
}: {
  event: TimelineEvent;
  image: TimelineImage | null;
  imageOnLeft: boolean;
}) {
  const colors = CATEGORY_COLORS[event.category];
  const excerpt = getSlideExcerpt(event);

  const imageColumn = image ? (
    <figure
      className={cn(
        "relative flex h-[38vh] max-h-[22rem] shrink-0 flex-col border-border/60 bg-background/25 backdrop-blur-sm sm:h-[40vh] md:h-full md:max-h-none md:shrink md:w-full",
        imageOnLeft
          ? "order-1 border-b md:order-none md:border-b-0 md:border-r"
          : "order-2 border-t md:order-none md:col-start-2 md:row-start-1 md:border-l md:border-t-0",
      )}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4 lg:p-5">
        <HistoryImage
          src={image.src}
          alt={image.alt}
          priority
          fill
          className="h-full w-full min-h-0 max-h-full"
          imgClassName="h-full w-full max-h-full max-w-full object-contain drop-shadow-md"
        />
      </div>
    </figure>
  ) : null;

  const textColumn = (
    <div
      className={cn(
        "flex min-h-0 flex-col bg-background/30 p-5 backdrop-blur-sm sm:p-7 lg:p-9",
        !image && "md:col-span-2",
        imageOnLeft ? "order-2 md:order-none" : "order-1 md:col-start-1 md:row-start-1",
      )}
    >
      <header className="shrink-0">
        <time
          dateTime={event.yearLabel ? undefined : String(event.year)}
          className="font-display text-5xl font-bold tabular-nums tracking-tight text-foreground sm:text-6xl lg:text-7xl"
        >
          {formatEventYear(event)}
        </time>

        <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-foreground sm:mt-3 sm:text-2xl lg:text-[1.75rem] lg:leading-tight">
          {event.title}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-4">
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px]"
            style={{ color: colors.accent, backgroundColor: colors.bg }}
          >
            {event.category}
          </span>
          {event.location ? (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {event.location}
            </span>
          ) : null}
        </div>
      </header>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 sm:mt-5 sm:gap-4">
        <p className="text-base font-medium leading-relaxed text-foreground sm:text-lg lg:text-xl lg:leading-relaxed">
          {event.summary}
        </p>

        <p className="min-h-0 flex-1 overflow-y-auto text-sm leading-[1.75] text-muted-foreground sm:text-base sm:leading-[1.8] lg:text-[17px]">
          {excerpt}
        </p>
      </div>

      <Link
        to={`/Historia/${event.id}`}
        className="mt-4 inline-flex shrink-0 items-center gap-1.5 pt-2 text-sm font-medium text-primary transition-colors hover:text-primary/80 sm:mt-5"
      >
        Ler conteúdo completo
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );

  return (
    <SlideBackground
      image={image}
      accent={colors.accent}
      glow={colors.glow}
      bg={colors.bg}
    >
      <div
        className={cn(
          "grid h-full min-h-0 grid-cols-1",
          image && "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
        )}
      >
        {imageOnLeft ? (
          <>
            {imageColumn}
            {textColumn}
          </>
        ) : (
          <>
            {textColumn}
            {imageColumn}
          </>
        )}
      </div>
    </SlideBackground>
  );
}

function HistoryPresentation({ className }: { className?: string }) {
  const totalSlides = TIMELINE_EVENTS.length + 1;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(totalSlides - 1, next));
      setDirection(clamped > index ? 1 : -1);
      setIndex(clamped);
    },
    [index, totalSlides],
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* recusado ou indisponível */
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
        case "ArrowUp":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(totalSlides - 1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          void toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext, goTo, totalSlides, toggleFullscreen]);

  const progress = totalSlides > 1 ? ((index + 1) / totalSlides) * 100 : 100;
  const isIntro = index === 0;
  const event = !isIntro ? TIMELINE_EVENTS[index - 1] : null;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p
          className="text-sm tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          Slide{" "}
          <span className="font-medium text-foreground">{index + 1}</span>
          {" de "}
          <span className="font-medium text-foreground">{totalSlides}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-2",
              "text-sm font-medium text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Sair da tela cheia</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Tela cheia</span>
              </>
            )}
          </button>

          {!isFullscreen ? (
            <Link
              to="/Historia"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <List className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Ver timeline</span>
            </Link>
          ) : null}
        </div>
      </div>

      <div
        ref={stageRef}
        className={cn(
          "flex flex-col rounded-2xl bg-background",
          isFullscreen && "h-full p-4 sm:p-6",
        )}
      >
        <div className="h-1 shrink-0 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>

        <div
          className={cn(
            "relative mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-md sm:mt-5",
            isFullscreen
              ? "min-h-0 flex-1"
              : "h-[78vh] max-h-[44rem] min-h-[20rem]",
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={isIntro ? "intro" : event?.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 h-full"
            >
              {isIntro ? (
                <IntroSlide />
              ) : event ? (
                <EventSlide
                  event={event}
                  image={PRESENTATION_IMAGES[index - 1] ?? null}
                  imageOnLeft={PRESENTATION_IMAGE_ON_LEFT[index - 1] ?? true}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <nav
          className="mt-4 flex shrink-0 items-center justify-between gap-3 sm:mt-5"
          aria-label="Navegação da apresentação"
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={index <= 0}
            aria-label="Slide anterior"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2.5",
              "text-sm font-medium text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-30",
            )}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={index >= totalSlides - 1}
            aria-label="Próximo slide"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2.5",
              "text-sm font-medium text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-30",
            )}
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </nav>
      </div>
    </div>
  );
}

export default memo(HistoryPresentation);

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getSong, messageForSongError } from "@/coletanea/api";
import Lyrics from "@/coletanea/components/Lyrics";
import MarqueeText from "@/coletanea/components/MarqueeText";
import SongScroll from "@/coletanea/components/SongScroll";
import ThemeButton from "@/coletanea/components/ThemeButton";
import { COLETANEA_PATH } from "@/coletanea/entry";
import {
  fontLimits,
  readFontSize,
  readShowChronological,
  writeFontSize,
  writeShowChronological,
} from "@/coletanea/lib/songs";
import { readShowVoices, songHasVoices, writeShowVoices } from "@/coletanea/lib/voices";

const barItem =
  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cl-pine";
const barOn = "text-cl-pine";
const barOff = "text-cl-ink-soft hover:text-cl-ink";
const barDisabled = "cursor-not-allowed text-cl-ink-soft/45";

export default function ColetaneaSongPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const idOk = Number.isInteger(numericId);
  const [song, setSong] = useState(null);
  const [status, setStatus] = useState(idOk ? "loading" : "missing");
  const [error, setError] = useState("");
  const [fontSize, setFontSize] = useState(readFontSize);
  const [showVoices, setShowVoices] = useState(readShowVoices);
  const [showChronological, setShowChronological] = useState(readShowChronological);

  useEffect(() => {
    if (!idOk) return undefined;
    let active = true;
    getSong(numericId)
      .then((data) => {
        if (!active) return;
        setSong(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) {
          setStatus("missing");
          return;
        }
        setError(messageForSongError(err));
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [idOk, numericId]);

  const changeFont = (delta) => {
    setFontSize((current) => {
      const next = Math.min(fontLimits.max, Math.max(fontLimits.min, current + delta));
      writeFontSize(next);
      return next;
    });
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-cl-line bg-cl-card/95 px-2 py-2 backdrop-blur">
        <div className="flex items-center gap-1">
          <Link
            to={COLETANEA_PATH}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-cl-ink-soft hover:bg-cl-paper hover:text-cl-ink"
            aria-label="Voltar à lista"
          >
            <span aria-hidden className="text-xl leading-none">
              ‹
            </span>
          </Link>
          <div className="min-w-0 flex-1 px-1">
            {song ? (
              <h1 className="flex min-h-6 min-w-0 items-stretch gap-3">
                <span className="flex w-[3ch] shrink-0 items-center justify-end text-base font-semibold tabular-nums leading-tight">
                  {String(song.numero).padStart(3, "0")}
                </span>
                <span aria-hidden className="w-px shrink-0 self-stretch bg-cl-ink-soft/35" />
                <span className="flex min-w-0 flex-1 items-center">
                  <MarqueeText text={song.titulo} className="text-base font-semibold leading-tight" />
                </span>
              </h1>
            ) : (
              <p className="text-sm font-medium">Coletânea</p>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            <div className="inline-flex h-10 items-center" role="group" aria-label="Tamanho da letra">
              <button
                type="button"
                className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-sm font-medium text-cl-ink-soft hover:text-cl-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cl-pine disabled:text-cl-ink-soft/35"
                aria-label="Diminuir letra"
                disabled={fontSize <= fontLimits.min}
                onClick={() => changeFont(-2)}
              >
                A−
              </button>
              <button
                type="button"
                className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-sm font-medium text-cl-ink-soft hover:text-cl-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cl-pine disabled:text-cl-ink-soft/35"
                aria-label="Aumentar letra"
                disabled={fontSize >= fontLimits.max}
                onClick={() => changeFont(2)}
              >
                A+
              </button>
            </div>
            <ThemeButton />
          </div>
        </div>
      </header>

      <SongScroll>
        {status === "loading" ? (
          <div className="space-y-3 p-5" aria-hidden>
            <div className="h-4 w-2/3 animate-pulse rounded bg-cl-paper" />
            <div className="h-28 animate-pulse rounded-xl bg-cl-paper" />
          </div>
        ) : status === "missing" ? (
          <div className="px-6 py-16 text-center">
            <p className="text-base font-medium">Música não encontrada</p>
            <Link to={COLETANEA_PATH} className="mt-3 inline-block text-sm font-medium text-cl-pine hover:underline">
              Voltar à lista
            </Link>
          </div>
        ) : status === "error" ? (
          <p className="px-4 py-10 text-center text-sm text-cl-ink-soft">{error}</p>
        ) : (
          <Lyrics
            letra={song.letra}
            refrao={song.refrao}
            vozesLetra={song.vozesLetra}
            vozesRefrao={song.vozesRefrao}
            cronologica={Boolean(song.cronologica) && showChronological}
            refraoPrimeiro={Boolean(song.refraoPrimeiro)}
            showVoices={showVoices}
            fontSize={fontSize}
          />
        )}
      </SongScroll>

      {song ? (
        <nav
          aria-label="Controles da música"
          className="grid shrink-0 grid-cols-2 border-t border-cl-line bg-cl-card pb-[env(safe-area-inset-bottom)]"
        >
          {songHasVoices(song) ? (
            <button
              type="button"
              className={`${barItem} ${showVoices ? barOn : barOff}`}
              aria-pressed={showVoices}
              onClick={() =>
                setShowVoices((current) => {
                  const next = !current;
                  writeShowVoices(next);
                  return next;
                })
              }
            >
              <VoicesIcon />
              Vozes
            </button>
          ) : (
            <button type="button" disabled className={`${barItem} ${barDisabled}`}>
              <VoicesIcon plain />
              Vozes
            </button>
          )}
          {song.cronologica && String(song.refrao || "").trim() ? (
            <button
              type="button"
              className={`${barItem} ${showChronological ? barOn : barOff}`}
              aria-pressed={showChronological}
              onClick={() =>
                setShowChronological((current) => {
                  const next = !current;
                  writeShowChronological(next);
                  return next;
                })
              }
            >
              <ChronologyIcon />
              Cronologia
            </button>
          ) : (
            <button type="button" disabled className={`${barItem} ${barDisabled}`}>
              <ChronologyIcon />
              Cronologia
            </button>
          )}
        </nav>
      ) : null}
    </div>
  );
}

function VoicesIcon({ plain }) {
  const men = plain ? "fill-current" : "fill-cl-voice-men";
  const women = plain ? "fill-current" : "fill-cl-voice-women";
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0">
      <circle cx="6.4" cy="6.4" r="2.5" className={men} />
      <path className={men} d="M2.2 18.2v-.4c0-2.4 1.85-4.1 4.2-4.1s4.2 1.7 4.2 4.1v.4z" />
      <circle cx="17.6" cy="6.4" r="2.5" className={women} />
      <path className={women} d="M13.4 18.2v-.4c0-2.4 1.85-4.1 4.2-4.1s4.2 1.7 4.2 4.1v.4z" />
    </svg>
  );
}

function ChronologyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 5.5v13" />
      <circle cx="7" cy="6" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="7" cy="18" r="1.35" fill="currentColor" stroke="none" />
      <path d="M11 6h7" />
      <path d="M11 12h7" />
      <path d="M11 18h5" />
    </svg>
  );
}

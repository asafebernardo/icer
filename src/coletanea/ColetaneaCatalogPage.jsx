import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listSongs, messageForSongError } from "@/coletanea/api";
import MarqueeText from "@/coletanea/components/MarqueeText";
import ThemeButton from "@/coletanea/components/ThemeButton";
import { COLETANEA_PATH } from "@/coletanea/entry";
import { filterSongs, lyricExcerpt } from "@/coletanea/lib/songs";

export default function ColetaneaCatalogPage() {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listSongs()
      .then((data) => {
        if (!active) return;
        setSongs(Array.isArray(data) ? data : []);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;
        setError(messageForSongError(err));
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => filterSongs(songs, query), [songs, query]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-cl-line bg-cl-card/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 flex-1 text-lg font-semibold leading-tight">
              Coletâneas de Louvor
            </h1>
            <ThemeButton />
          </div>
          <input
            className="mt-3 h-11 w-full rounded-xl border border-cl-line bg-cl-paper px-3 text-sm outline-none ring-cl-pine focus:ring-2"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Número, título ou letra"
            aria-label="Pesquisar música"
            type="search"
          />
        </header>

        {status === "loading" ? (
          <div className="space-y-2 p-4" aria-hidden>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-cl-paper" />
            ))}
          </div>
        ) : status === "error" ? (
          <p className="px-4 py-10 text-center text-sm text-cl-ink-soft">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-base font-medium">
              {songs.length === 0 ? "Nenhuma música ainda" : "Nenhum resultado"}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-cl-ink-soft">
              {songs.length === 0
                ? "As letras são publicadas no painel do site."
                : "Tente outro número, título ou trecho da letra."}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((song) => (
              <li key={song.id} className="border-b border-cl-line/80 last:border-b-0">
                <Link
                  to={`${COLETANEA_PATH}/musicas/${song.id}`}
                  className="flex min-h-14 min-w-0 items-stretch gap-3 px-4 py-3 hover:bg-cl-paper"
                >
                  <span className="flex w-[3ch] shrink-0 items-center justify-end self-center text-[15px] font-medium tabular-nums">
                    {String(song.numero).padStart(3, "0")}
                  </span>
                  <span aria-hidden className="w-px shrink-0 bg-cl-ink-soft/35" />
                  <span className="flex min-w-0 flex-1 items-center">
                    <span className="min-w-0 flex-1">
                      <MarqueeText text={song.titulo} className="text-[15px] font-medium" />
                      <LyricExcerpt song={song} query={query} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LyricExcerpt({ song, query }) {
  const excerpt = lyricExcerpt(song, query);
  if (!excerpt) return null;
  return (
    <p className="mt-0.5 truncate text-xs leading-snug text-cl-ink-soft">
      {excerpt.before}
      <span className="font-medium text-cl-ink">{excerpt.match}</span>
      {excerpt.after}
    </p>
  );
}

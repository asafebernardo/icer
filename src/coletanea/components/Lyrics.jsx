import { stanzasOf } from "@/coletanea/lib/voices.js";

const REFRAIN_LABEL = /^(refr[aã]o|coro)\s*:?$/i;

/** Separa um texto antigo em que a palavra Refrão ainda estava dentro da letra. */
export function splitLyrics(text) {
  const raw = String(text ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return { letra: "", refrao: "" };

  const verses = [];
  let refrao = "";

  raw.split(/\n{2,}/).forEach((chunk, index, chunks) => {
    if (refrao && index > 0 && chunks[index - 1] && REFRAIN_LABEL.test(chunks[index - 1].split("\n")[0].trim()) && chunks[index - 1].split("\n").length === 1) {
      return;
    }
    const lines = chunk.split("\n");
    const first = lines[0].trim();
    if (!REFRAIN_LABEL.test(first)) {
      verses.push(chunk);
      return;
    }
    const inline = lines.slice(1).join("\n").trim();
    if (inline) {
      refrao = inline;
      return;
    }
    const next = chunks[index + 1];
    refrao = next ? next.trim() : "";
  });

  return { letra: verses.join("\n\n").trim(), refrao };
}

export function stripRefrainLabel(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^(?:refr[aã]o|coro)\s*:?\s*\n+/i, "")
    .trim();
}

function voiceClass(voice, showVoices) {
  if (!showVoices) return "";
  if (voice === "homens") return "text-cl-voice-men";
  if (voice === "mulheres") return "text-cl-voice-women";
  return "";
}

function Stanza({ lines, showVoices, italic }) {
  return (
    <div>
      {lines.map((line, index) => (
        <p key={index} className={`whitespace-pre-wrap ${italic ? "italic" : ""}`}>
          {line.segments.map((segment, segmentIndex) => (
            <span key={segmentIndex} className={voiceClass(segment.voice, showVoices)}>
              {segment.text}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function Refrain({ lines, showVoices }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[0.78em] not-italic tracking-[0.16em] text-cl-ink-soft">Refrão</p>
      <Stanza lines={lines} showVoices={showVoices} italic />
    </div>
  );
}

export default function Lyrics({ letra, refrao, vozesLetra, vozesRefrao, cronologica, refraoPrimeiro, showVoices, fontSize }) {
  const verses = stanzasOf(letra, vozesLetra);
  const chorus = stanzasOf(stripRefrainLabel(refrao), vozesRefrao).flat();
  const lead = Boolean(refraoPrimeiro) && chorus.length > 0;
  const repeated = Boolean(cronologica) && chorus.length > 0;

  return (
    <article
      className="space-y-6 px-5 py-6 text-center font-cl-lyric leading-relaxed"
      style={{ fontSize: `${fontSize}px` }}
    >
      {repeated ? (
        <>
          {lead ? <Refrain lines={chorus} showVoices={showVoices} /> : null}
          {verses.map((stanza, index) => (
            <div key={index} className="space-y-6">
              <Stanza lines={stanza} showVoices={showVoices} />
              <Refrain lines={chorus} showVoices={showVoices} />
            </div>
          ))}
        </>
      ) : lead ? (
        <>
          <Refrain lines={chorus} showVoices={showVoices} />
          {verses.map((stanza, index) => (
            <Stanza key={index} lines={stanza} showVoices={showVoices} />
          ))}
        </>
      ) : (
        <>
          {verses[0] ? <Stanza lines={verses[0]} showVoices={showVoices} /> : null}
          {chorus.length > 0 ? <Refrain lines={chorus} showVoices={showVoices} /> : null}
          {verses.slice(1).map((stanza, index) => (
            <Stanza key={index} lines={stanza} showVoices={showVoices} />
          ))}
        </>
      )}
    </article>
  );
}

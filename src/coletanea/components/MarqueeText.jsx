import { useEffect, useRef, useState } from "react";

const GAP = 48;
const SPEED = 36;

export default function MarqueeText({ text, className = "" }) {
  const boxRef = useRef(null);
  const sampleRef = useRef(null);
  const [motion, setMotion] = useState(null);

  useEffect(() => {
    const box = boxRef.current;
    const sample = sampleRef.current;
    if (!box || !sample) return undefined;

    const measure = () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const width = sample.scrollWidth;
      const overflow = !reduce && width > box.clientWidth + 1;
      setMotion(
        overflow
          ? { duration: Math.max(8, (width + GAP) / SPEED) }
          : null,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={boxRef} className={`relative block min-w-0 flex-1 overflow-hidden ${className}`}>
      <span ref={sampleRef} className="pointer-events-none absolute whitespace-nowrap opacity-0" aria-hidden>
        {text}
      </span>
      {motion ? (
        <span className="marquee-track" style={{ animationDuration: `${motion.duration}s` }}>
          <span className="marquee-item">{text}</span>
          <span className="marquee-item" aria-hidden>
            {text}
          </span>
        </span>
      ) : (
        <span className="block truncate">{text}</span>
      )}
    </span>
  );
}

import { toggleTheme, useTheme } from "@/coletanea/lib/theme.js";

export default function ThemeButton({ className = "h-10 w-10" }) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-cl-ink-soft hover:bg-cl-paper hover:text-cl-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cl-pine ${className}`}
      aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
      onClick={toggleTheme}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7 18 18M18 6l-1.3 1.3M7.3 16.7 6 18" />
    </svg>
  );
}

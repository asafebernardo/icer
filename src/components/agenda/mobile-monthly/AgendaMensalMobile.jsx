import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, Eye, Check } from "lucide-react";
import "./agendaMensalMobile.css";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const CATEGORY_META = {
  Culto: { dot: "#3b82f6" },
  Reunião: { dot: "#16a34a" },
  Evento: { dot: "#d97706" },
  Aviso: { dot: "#7c3aed" },
};

function normalizeEvent(raw) {
  const date = raw?.date || raw?.data;
  const time = raw?.time || raw?.horario || "";
  const category = raw?.category || raw?.categoria || "Evento";
  return {
    id: String(raw?.id ?? crypto.randomUUID()),
    date: String(date || ""),
    time: String(time || "").trim(),
    title: String(raw?.title || raw?.titulo || "Evento").trim(),
    category: String(category || "Evento").trim(),
    preletor: String(raw?.preletor || raw?.speaker || "").trim(),
    location: String(raw?.location || raw?.local || "").trim(),
    description: String(raw?.description || raw?.descricao || "").trim(),
  };
}

function withOrder(raw, order) {
  return { ...raw, __order: order };
}

function hexToRgba(hex, alpha) {
  const h = String(hex || "").replace("#", "").trim();
  if (!h) return `rgba(59, 130, 246, ${alpha})`;
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(59, 130, 246, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function monthEventsOnly(events, monthDate) {
  const ms = startOfMonth(monthDate);
  const me = endOfMonth(monthDate);
  return events.filter((e) => {
    if (!e?.date) return false;
    const d = parseISO(e.date);
    if (Number.isNaN(d?.getTime?.())) return false;
    return d >= ms && d <= me;
  });
}

function primaryEventForDay(evs) {
  if (!Array.isArray(evs) || evs.length === 0) return null;
  let best = evs[0];
  for (const e of evs) {
    if ((e?.__order ?? Infinity) < (best?.__order ?? Infinity)) best = e;
  }
  return best;
}

function monthLabel(d) {
  return format(d, "MMMM yyyy", { locale: ptBR });
}

function dayKey(d) {
  return format(d, "yyyy-MM-dd");
}

function buildMiniMonthGrid(monthDate) {
  const start = startOfWeek(startOfMonth(monthDate), { locale: ptBR });
  const end = addDays(start, 41); // 6 semanas fixas (42 células)
  const days = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function groupByDay(events) {
  const map = new Map();
  for (const e of events) {
    if (!e?.date) continue;
    const d = parseISO(e.date);
    if (Number.isNaN(d?.getTime?.())) continue;
    const k = dayKey(d);
    const arr = map.get(k) || [];
    arr.push(e);
    map.set(k, arr);
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    map.set(k, arr);
  }
  return map;
}

function BottomSheet({ open, title, onClose, children }) {
  return (
    <>
      <div
        className={`am-sheetOverlay ${open ? "am-sheetOverlay--open" : ""}`}
        aria-hidden={!open}
        onClick={onClose}
      />
      <div
        className={`am-sheet ${open ? "am-sheet--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="am-sheetInner">
          <div className="am-sheetGrab" />
          <div className="am-sheetHeader">
            <div className="am-sheetTitle">{title}</div>
            <button type="button" className="am-sheetClose" onClick={onClose} aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="am-sheetBody">{children}</div>
        </div>
      </div>
    </>
  );
}

function EventCard({ ev, showPreletor, onMore }) {
  const dot = CATEGORY_META[ev.category]?.dot || "#3b82f6";
  return (
    <div className={`am-card am-eventCard`} style={{ borderLeft: `6px solid ${dot}` }}>
      <div className="am-eventRow">
        <div className="am-time">{ev.time || "—"}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="am-evtTitle">{ev.title}</div>
          {showPreletor && ev.preletor ? (
            <div className="am-evtSub">{ev.preletor}</div>
          ) : null}
          <div className="am-evtMeta">
            <span className="am-tag">{ev.category}</span>
            {ev.location ? <span className="am-loc">{ev.location}</span> : null}
          </div>
        </div>
        <button type="button" className="am-more" onClick={onMore}>
          ver mais
        </button>
      </div>
    </div>
  );
}

function UpcomingEvents({ events, showPreletor }) {
  const upcoming = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((e) => e?.date)
      .map((e) => ({ ...e, _d: parseISO(e.date) }))
      .filter((e) => !Number.isNaN(e._d?.getTime?.()))
      .filter((e) => e._d >= startOfMonth(addMonths(now, -1)))
      .sort((a, b) => a._d - b._d || String(a.time).localeCompare(String(b.time)))
      .slice(0, 6);
  }, [events]);

  if (!upcoming.length) {
    return <div className="am-empty">Sem próximos eventos por aqui.</div>;
  }

  return (
    <div className="am-upcomingList">
      {upcoming.map((e) => (
        <div key={e.id} className={`am-card am-upcomingCard`}>
          <div className="am-upcomingMeta">
            <span>{format(e._d, "dd/MM", { locale: ptBR })}</span>
            <span>·</span>
            <span>{e.time || "—"}</span>
            <span>·</span>
            <span>{e.category}</span>
          </div>
          <div className="am-upcomingTitle">{e.title}</div>
          {showPreletor && e.preletor ? (
            <div className="am-upcomingSub">{e.preletor}</div>
          ) : null}
          {e.description ? <div className="am-upcomingDesc">{e.description}</div> : null}
        </div>
      ))}
    </div>
  );
}

function MiniCalendarSkeleton() {
  return (
    <div className="am-card am-miniCalendar">
      <div className="am-weekdays">
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: "center" }}>
            {d}
          </div>
        ))}
      </div>
      <div className="am-grid">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className="am-skel" style={{ aspectRatio: "1 / 1", borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );
}

function UpcomingSkeleton() {
  return (
    <div className="am-upcomingList">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="am-skel" style={{ height: 104, borderRadius: 20 }} />
      ))}
    </div>
  );
}

/**
 * Agenda Mensal mobile-first (360–480px).
 * - Swipe horizontal para trocar mês
 * - Bottom sheet para eventos do dia
 * - Filtro por categoria
 * - Dados da API (prop `events`)
 */
export default function AgendaMensalMobile({
  events: eventsFromApi = [],
  showPreletorCards,
  setShowPreletorCards,
}) {
  const [loading, setLoading] = useState(true);
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState("Todas");

  const swipeRef = useRef({ x: 0, y: 0, active: false });

  const events = useMemo(() => {
    const base = Array.isArray(eventsFromApi) ? eventsFromApi : [];
    return base.map((r, idx) => withOrder(normalizeEvent(r), idx));
  }, [eventsFromApi]);

  const monthEvents = useMemo(
    () => monthEventsOnly(events, monthDate),
    [events, monthDate],
  );

  const filteredEvents = useMemo(() => {
    if (category === "Todas") return events;
    return events.filter((e) => e.category === category);
  }, [events, category]);

  const byDay = useMemo(() => groupByDay(filteredEvents), [filteredEvents]);

  const gridDays = useMemo(() => buildMiniMonthGrid(monthDate), [monthDate]);

  const selectedKey = useMemo(() => dayKey(selectedDay), [selectedDay]);
  const selectedEvents = byDay.get(selectedKey) || [];

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(t);
  }, []);

  const goToday = () => {
    const t = new Date();
    setMonthDate(startOfMonth(t));
    setSelectedDay(t);
  };

  const openDay = (d) => {
    setSelectedDay(d);
    setSheetOpen(true);
  };

  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, active: true };
  };
  const onTouchEnd = (e) => {
    const t = e.changedTouches?.[0];
    const s = swipeRef.current;
    swipeRef.current.active = false;
    if (!t || !s.active) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    setMonthDate((m) => addMonths(m, dx < 0 ? 1 : -1));
  };

  const categories = useMemo(() => {
    const s = new Set(monthEvents.map((e) => e.category).filter(Boolean));
    return ["Todas", ...Array.from(s)];
  }, [monthEvents]);

  useEffect(() => {
    if (category === "Todas") return;
    if (!categories.includes(category)) setCategory("Todas");
  }, [category, categories]);

  return (
    <div className="am-root" aria-label="Agenda mensal (mobile)">
      <div className="am-stickyHeader">
        <div className="am-headerInner">
          <button
            type="button"
            className="am-iconBtn"
            onClick={() => setMonthDate((m) => addMonths(m, -1))}
            aria-label="Voltar mês"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="am-monthLabel">{monthLabel(monthDate)}</div>
          <button
            type="button"
            className="am-iconBtn"
            onClick={() => setMonthDate((m) => addMonths(m, 1))}
            aria-label="Avançar mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="am-todayBtnWrap">
          <button type="button" className="am-todayBtn" onClick={goToday}>
            Hoje
          </button>
          <button
            type="button"
            className="am-preletorBtn"
            onClick={() => setShowPreletorCards((v) => !v)}
            aria-pressed={showPreletorCards}
            aria-label={showPreletorCards ? "Preletores: ativo" : "Preletores: inativo"}
          >
            {showPreletorCards ? (
              <Check className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span className="am-preletorLabel">
              {showPreletorCards ? "Preletores: ativo" : "Preletores: inativo"}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <MiniCalendarSkeleton />
          <div className="am-sectionTitle">Próximos eventos</div>
          <UpcomingSkeleton />
        </>
      ) : (
        <>
          <div
            className="am-card am-miniCalendar"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            role="group"
            aria-label="Mini calendário mensal (arraste para trocar mês)"
          >
            <div className="am-weekdays">
              {WEEKDAYS.map((d) => (
                <div key={d} style={{ textAlign: "center" }}>
                  {d}
                </div>
              ))}
            </div>
            <div className="am-grid">
              {gridDays.map((d) => {
                const k = dayKey(d);
                const evs = byDay.get(k) || [];
                const inMonth = isSameMonth(d, monthDate);
                const selected = isSameDay(d, selectedDay);
                const today = isToday(d);
                const primary = primaryEventForDay(evs);
                const dot = primary
                  ? CATEGORY_META[primary.category]?.dot || "#3b82f6"
                  : null;
                const dayStyle =
                  inMonth && dot
                    ? {
                        backgroundColor: hexToRgba(dot, 0.18),
                        borderColor: hexToRgba(dot, 0.35),
                      }
                    : undefined;
                return (
                  <button
                    key={k}
                    type="button"
                    className={[
                      "am-dayBtn",
                      today ? "am-dayBtn--today" : "",
                      selected ? "am-dayBtn--selected" : "",
                      inMonth && evs.length > 0 ? "am-dayBtn--hasEvent" : "",
                    ].join(" ")}
                    onClick={() => openDay(d)}
                    aria-label={`${format(d, "dd/MM", { locale: ptBR })} — ${evs.length} evento(s)`}
                    aria-disabled={!inMonth}
                    style={dayStyle}
                  >
                    {format(d, "d")}
                    {evs.length > 0 ? (
                      <>
                        <span className="am-dot" style={{ background: dot }} aria-hidden />
                        <span className="am-count" aria-hidden>
                          {evs.length}
                        </span>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="am-toolbar" aria-label="Filtro por categoria">
              {categories.slice(0, 4).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="am-chip"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="am-sectionTitle">Próximos eventos</div>
          <UpcomingEvents events={filteredEvents} showPreletor={showPreletorCards} />
        </>
      )}

      <BottomSheet
        open={sheetOpen}
        title={format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
        onClose={() => setSheetOpen(false)}
      >
        {selectedEvents.length ? (
          selectedEvents.map((ev) => (
            <EventCard
              key={ev.id}
              ev={ev}
              showPreletor={showPreletorCards}
              onMore={() => {
                setSheetOpen(false);
              }}
            />
          ))
        ) : (
          <div className="am-empty">Nenhum evento neste dia.</div>
        )}
      </BottomSheet>
    </div>
  );
}


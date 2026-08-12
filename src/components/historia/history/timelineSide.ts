import type { TimelineEvent } from "@/components/historia/history/types";

/**
 * Alterna esquerda/direita por ano; eventos do mesmo ano ficam no mesmo lado.
 * `true` = card à esquerda da linha central.
 */
export function buildYearSideMap(events: TimelineEvent[]): boolean[] {
  const sides: boolean[] = [];
  const yearToSide = new Map<number, boolean>();
  let nextIsLeft = true;

  for (const event of events) {
    const existing = yearToSide.get(event.year);
    if (existing !== undefined) {
      sides.push(existing);
    } else {
      yearToSide.set(event.year, nextIsLeft);
      sides.push(nextIsLeft);
      nextIsLeft = !nextIsLeft;
    }
  }

  return sides;
}

/**
 * @param events
 * @param index índice do evento na timeline
 */
export function isTimelineEventOnLeft(
  events: TimelineEvent[],
  index: number,
): boolean {
  if (index < 0 || index >= events.length) return index % 2 === 0;
  const sides = buildYearSideMap(events);
  return sides[index] ?? index % 2 === 0;
}

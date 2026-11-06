import { useSyncExternalStore } from "react";

export const THEME_KEY = "coletanea-theme";

let current = "light";
let root = null;
const listeners = new Set();

function readStored() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

function apply() {
  if (!root) return;
  root.dataset.theme = current;
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function getTheme() {
  return current;
}

export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(next) {
  if (next !== "light" && next !== "dark") return;
  current = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore */
  }
  apply();
  emit();
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

/** O tema fica no aplicativo. Não altera o tema do site ICER. */
export function attachThemeRoot(element) {
  root = element;
  current = readStored();
  apply();
  emit();
  return () => {
    if (root === element) root = null;
  };
}

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, getTheme, () => "light");
}

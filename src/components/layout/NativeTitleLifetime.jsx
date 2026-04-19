import { useEffect } from "react";

/** Tempo até o browser esconder tooltips nativos (`title`) após aparecerem. */
export const NATIVE_TITLE_HIDE_MS = 3000;

/**
 * Associa a elementos com `title` um temporizador que limpa o atributo após
 * {@link NATIVE_TITLE_HIDE_MS} ms (o browser remove o balão). Ao sair com o rato,
 * o texto original é reposto. Use `data-skip-native-title-lifetime` no elemento
 * para desativar.
 */
export default function NativeTitleLifetime() {
  useEffect(() => {
    const ms = NATIVE_TITLE_HIDE_MS;
    const bound = new WeakSet();
    const cleanups = [];

    function attach(el) {
      if (!(el instanceof HTMLElement)) return;
      if (!el.hasAttribute("title")) return;
      if (el.hasAttribute("data-skip-native-title-lifetime")) return;
      const raw = el.getAttribute("title") ?? "";
      if (!raw.trim()) return;
      if (bound.has(el)) return;
      bound.add(el);

      const original = raw;
      let timer;

      const clearTimer = () => {
        if (timer != null) {
          window.clearTimeout(timer);
          timer = undefined;
        }
      };

      const armHide = () => {
        clearTimer();
        el.setAttribute("title", original);
        timer = window.setTimeout(() => {
          el.setAttribute("title", "");
        }, ms);
      };

      const restoreNow = () => {
        clearTimer();
        el.setAttribute("title", original);
      };

      el.addEventListener("mouseenter", armHide);
      el.addEventListener("mouseleave", restoreNow);
      el.addEventListener("focus", armHide);
      el.addEventListener("blur", restoreNow);

      cleanups.push(() => {
        el.removeEventListener("mouseenter", armHide);
        el.removeEventListener("mouseleave", restoreNow);
        el.removeEventListener("focus", armHide);
        el.removeEventListener("blur", restoreNow);
        restoreNow();
      });
    }

    function scan() {
      document.querySelectorAll("[title]").forEach(attach);
    }

    scan();

    let debounce;
    const mo = new MutationObserver(() => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(scan, 0);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(debounce);
      mo.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}

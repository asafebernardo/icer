import logo from "../../../C.L.png";

/** Acima do selo do reCAPTCHA (60px) e do menu inferior no celular. */
const ABOVE_CAPTCHA =
  "bottom-[calc(5.25rem+60px+0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.25rem+60px+0.75rem)]";

export default function ColetaneaAppLink() {
  return (
    <a
      href="https://asafebernardo.github.io/coletaneaMusicas/"
      aria-label="Abrir Coletânea de Louvor"
      title="Coletânea de Louvor"
      className={`fixed right-2 z-50 inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-2.5 text-black shadow-xl ring-1 ring-black/10 transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-6 ${ABOVE_CAPTCHA}`}
    >
      <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
      <span className="whitespace-nowrap text-sm font-semibold">
        Coletânea de Louvor
      </span>
    </a>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Pencil,
  Check,
  X,
  Navigation,
} from "lucide-react";

import {
  getSiteConfig,
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import SiteLogoMark from "@/components/layout/SiteLogoMark";
import SiteSocialLinks from "@/components/layout/SiteSocialLinks";
import { hasAnyResolvedSocialLinks } from "@/lib/socialLinks";
import { MENU } from "@/lib/auth";
import useCanEdit from "@/lib/useCanEdit";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEFAULT_CONFIG = {
  footerDescricao:
    "Somos uma família comprometida com a pregação do evangelho de Jesus Cristo.",
  footerEndereco: "Rua Hermes da Fonseca, 1559 — Bela Vista, Chapecó - SC",
  footerTelefone: "(49) 9952-7840",
  footerEmail: "icerchap@gmail.com",
  footerHorario1Dia: "Domingo",
  footerHorario1Desc: "Culto — 9h e 19h",
  footerHorario2Dia: "Quarta-feira",
  footerHorario2Desc: "Reunião de oração — 19h30",
};

function EditableText({ value, onSave, className, multiline = false, singleLine = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onSave(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    const field = multiline ? (
      <textarea
        className="bg-muted border border-border text-foreground rounded px-2 py-1 text-sm w-full min-w-0 flex-1 resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
      />
    ) : (
      <input
        className={cn(
          "bg-muted border border-border text-foreground rounded px-2 py-1 text-sm min-w-0 focus:outline-none focus:ring-2 focus:ring-ring/50",
          singleLine ? "flex-1" : "w-full flex-1",
        )}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
      />
    );
    const actions = (
      <span className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={save}
          className="p-0.5 rounded bg-muted hover:bg-muted/80 text-foreground border border-border"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={cancel}
          className="p-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );

    if (singleLine && !multiline) {
      return (
        <span className="flex w-full min-w-0 max-w-full items-center gap-1">
          {field}
          {actions}
        </span>
      );
    }

    return (
      <span className="inline-flex w-full min-w-0 max-w-full flex-col gap-1">
        {field}
        {actions}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "group/editable flex w-full min-w-0 gap-1",
        singleLine ? "flex-nowrap items-center" : "flex-wrap items-start",
        className ?? "",
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1",
          singleLine ? "truncate" : "break-words [overflow-wrap:anywhere]",
        )}
        title={singleLine && value ? String(value) : undefined}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={cn(
          "opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 sm:opacity-0 sm:group-hover/editable:opacity-100 focus-visible:opacity-100",
          !singleLine && "mt-0.5",
        )}
      >
        <Pencil className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

export default function Footer() {
  const canEditHome = useCanEdit(MENU.HOME);
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [showSocialCol, setShowSocialCol] = useState(() =>
    hasAnyResolvedSocialLinks(getSiteConfig()),
  );

  useEffect(() => {
    const saved = getSiteConfig();
    setCfg({ ...DEFAULT_CONFIG, ...saved });
  }, []);

  useEffect(() => {
    const sync = () => setShowSocialCol(hasAnyResolvedSocialLinks(getSiteConfig()));
    sync();
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  const update = (key, value) => {
    const next = { ...cfg, [key]: value };
    setCfg(next);
    if (canEditHome) {
      savePublicSiteConfigAdmin({ [key]: value })
        .then(() => refreshPublicSiteConfig())
        .then(() => toast.success("Rodapé salvo com sucesso."))
        .catch(() => {
          setSiteConfig({ [key]: value });
          toast.success("Rodapé salvo com sucesso.");
        });
    } else {
      setSiteConfig({ [key]: value });
      toast.success("Rodapé salvo com sucesso.");
    }
  };

  const Txt = ({ field, className, multiline, singleLine }) => {
    const value = cfg?.[field] ?? "";

    if (canEditHome) {
      return (
        <EditableText
          value={value}
          onSave={(v) => update(field, v)}
          className={className}
          multiline={multiline}
          singleLine={singleLine}
        />
      );
    }

    return (
      <span
        className={cn(
          "block min-w-0 max-w-full",
          singleLine ? "truncate" : "break-words [overflow-wrap:anywhere]",
          className,
        )}
        title={singleLine && value ? String(value) : undefined}
      >
        {value}
      </span>
    );
  };

  const endereco = String(cfg?.footerEndereco ?? "").trim();
  const encoded = endereco ? encodeURIComponent(endereco) : "";

  const gitBranch = String(import.meta.env.VITE_ICER_GIT_BRANCH || "").trim();

  const sectionTitleClass =
    "font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground";

  return (
    <footer className="relative border-t border-border bg-background text-foreground overflow-hidden">
      <div
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/[0.07] blur-3xl dark:bg-accent/[0.05]"
        aria-hidden
      />
      <div className="container-page relative py-10 lg:py-12">
        <section
          className="grid grid-cols-1 gap-8 sm:gap-9 lg:grid-cols-12 lg:gap-x-8"
          aria-label="Informações do rodapé"
        >
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-3">
            <Link
              to="/Home"
              className="group -m-1 flex max-w-sm items-start gap-3 rounded-xl p-1 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <SiteLogoMark
                imgClassName="h-9 w-auto max-h-10 max-w-[120px] shrink-0 rounded-md object-contain object-left transition-opacity group-hover:opacity-90 sm:max-w-[180px]"
              />
              <div className="min-w-0 pt-0.5">
                <span className="font-display block text-lg font-semibold tracking-tight text-foreground">
                  ICER Chapecó
                </span>
                <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Casa de Oração
                </span>
              </div>
            </Link>
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-col gap-3",
              showSocialCol ? "lg:col-span-5" : "lg:col-span-6",
            )}
          >
            <h2 className={sectionTitleClass}>Contato</h2>
            <ul className="flex min-w-0 flex-col gap-0 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/50 bg-card/40 text-sm text-muted-foreground">
              {endereco ? (
                <>
                  <li className="bg-muted/15">
                    <iframe
                      title="Mapa da ICER Chapecó"
                      src={`https://www.google.com/maps?q=${encoded}&output=embed`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="block h-[100px] w-full sm:h-[108px]"
                      style={{ border: 0 }}
                      allowFullScreen
                    />
                  </li>
                  <li className="flex min-w-0 items-start gap-2.5 px-3 py-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                    <div className="min-w-0 flex-1 break-words leading-relaxed">
                      <Txt field="footerEndereco" className="block w-full" multiline />
                    </div>
                  </li>
                  <li className="px-3 py-2.5">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Como chegar
                    </a>
                  </li>
                </>
              ) : null}
              <li className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                <Phone className="h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <Txt field="footerTelefone" className="block w-full" singleLine />
                </div>
              </li>
              <li className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <Txt field="footerEmail" className="block w-full" singleLine />
                </div>
              </li>
            </ul>
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-col gap-3",
              showSocialCol ? "lg:col-span-2" : "lg:col-span-3",
            )}
          >
            <h2 className={sectionTitleClass}>Horários</h2>
            <ul className="flex min-w-0 flex-col gap-0 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/50 bg-card/40 px-3 py-1 text-sm text-muted-foreground">
              <li className="flex min-w-0 gap-2.5 py-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5 break-words [overflow-wrap:anywhere]">
                  <p className="font-medium text-foreground">
                    <Txt field="footerHorario1Dia" />
                  </p>
                  <Txt field="footerHorario1Desc" className="leading-relaxed" />
                </div>
              </li>
              <li className="flex min-w-0 gap-2.5 py-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65" aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5 break-words [overflow-wrap:anywhere]">
                  <p className="font-medium text-foreground">
                    <Txt field="footerHorario2Dia" />
                  </p>
                  <Txt field="footerHorario2Desc" className="leading-relaxed" />
                </div>
              </li>
            </ul>
          </div>

          {showSocialCol ? (
            <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
              <SiteSocialLinks variant="footer" />
            </div>
          ) : null}
        </section>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-border/80 pt-8 text-center sm:mt-11 sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ICER Chapecó. Todos os direitos reservados.
          </p>
          {canEditHome ? (
            <p className="max-w-sm text-[11px] leading-snug text-muted-foreground/90 sm:max-w-xs sm:text-right">
              Como administrador, passe o rato sobre um texto e use o ícone de lápis para editar.
            </p>
          ) : null}
        </div>
        {gitBranch ? (
          <p
            className="mt-4 text-center text-[10px] font-mono tracking-wide text-muted-foreground/70"
            title="Branch Git no momento do build"
          >
            Versão: {gitBranch}
          </p>
        ) : null}
      </div>
    </footer>
  );
}

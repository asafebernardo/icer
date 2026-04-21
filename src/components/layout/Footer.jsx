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
} from "lucide-react";

import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import SiteLogoMark from "@/components/layout/SiteLogoMark";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, MENU } from "@/lib/auth";

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

function EditableText({ value, onSave, className, multiline = false }) {
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
    return (
      <span className="inline-flex flex-col gap-1 w-full">
        {multiline ? (
          <textarea
            className="bg-muted border border-border text-foreground rounded px-2 py-1 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-ring/50"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        ) : (
          <input
            className="bg-muted border border-border text-foreground rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring/50"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        )}
        <span className="flex gap-1">
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
      </span>
    );
  }

  return (
    <span
      className={`group/editable inline-flex items-start gap-1 ${className}`}
    >
      <span>{value}</span>
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="opacity-0 group-hover/editable:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
      >
        <Pencil className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

export default function Footer() {
  const user = useSyncedAuthUser();
  const canEditHome = canMenuAction(user, MENU.HOME, "edit");
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const saved = getSiteConfig();
    setCfg({ ...DEFAULT_CONFIG, ...saved });
  }, []);

  const update = (key, value) => {
    const next = { ...cfg, [key]: value };
    setCfg(next);
    setSiteConfig(next);
  };

  const Txt = ({ field, className, multiline }) => {
    const value = cfg?.[field] ?? "";

    if (canEditHome) {
      return (
        <EditableText
          value={value}
          onSave={(v) => update(field, v)}
          className={className}
          multiline={multiline}
        />
      );
    }

    return <span className={className}>{value}</span>;
  };

  return (
    <footer className="relative bg-background text-foreground border-t border-border overflow-hidden">
      <div
        className="pointer-events-none absolute -top-24 right-0 w-96 h-96 rounded-full bg-accent/[0.07] blur-3xl dark:bg-accent/[0.05]"
        aria-hidden
      />
      <div className="container-page relative py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-14">
          {/* Brand */}
          <div className="space-y-4">
            <Link
              to="/Home"
              className="flex items-start gap-3 group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <SiteLogoMark
                imgClassName="h-9 w-auto max-h-10 max-w-[120px] sm:max-w-[200px] object-contain object-left shrink-0 rounded-md group-hover:opacity-90 transition-opacity"
                fallbackClassName="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/85 flex items-center justify-center shrink-0 shadow-soft ring-1 ring-primary/15 group-hover:scale-[1.02] transition-transform duration-200"
                iconClassName="w-4 h-4 text-primary-foreground"
              />
              <div className="min-w-0 pt-0.5">
                <span className="font-display text-lg font-semibold tracking-tight block">
                  ICER Chapecó
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground block mt-0.5">
                  Casa de Oração
                </span>
              </div>
            </Link>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-sm">
              <Txt field="footerDescricao" multiline />
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-xs tracking-[0.16em] uppercase text-muted-foreground">
              Navegação
            </h4>
            <div className="flex flex-col gap-1">
              {[
                { label: "Início", path: "/Home" },
                { label: "Postagens", path: "/Postagens" },
                { label: "Recursos", path: "/Recursos" },
                { label: "Agenda", path: "/Agenda" },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="inline-flex items-center min-h-[44px] text-[15px] text-foreground/90 hover:text-foreground transition-all duration-200 rounded-lg py-2 -mx-1 px-2 hover:bg-muted/80"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-xs tracking-[0.16em] uppercase text-muted-foreground">
              Contato
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70" />
                <Txt field="footerEndereco" />
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0 text-foreground/70" />
                <Txt field="footerTelefone" />
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0 text-foreground/70" />
                <Txt field="footerEmail" />
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-xs tracking-[0.16em] uppercase text-muted-foreground">
              Horários
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70" />
                <div>
                  <p className="font-medium text-foreground">
                    <Txt field="footerHorario1Dia" />
                  </p>
                  <Txt field="footerHorario1Desc" />
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-foreground/70" />
                <div>
                  <p className="font-medium text-foreground">
                    <Txt field="footerHorario2Dia" />
                  </p>
                  <Txt field="footerHorario2Desc" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-10 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ICER Chapecó. Todos os direitos
            reservados.
          </p>
          {canEditHome && (
            <p className="text-xs text-muted-foreground/90 mt-2 max-w-md mx-auto">
              Como administrador, pode apontar o rato sobre um texto e clicar no
              lápis para alterar.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

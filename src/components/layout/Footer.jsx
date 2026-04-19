import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Church,
  MapPin,
  Phone,
  Mail,
  Clock,
  Pencil,
  Check,
  X,
} from "lucide-react";

import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
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
            className="bg-primary-foreground/10 border border-primary-foreground/30 text-primary-foreground rounded px-2 py-1 text-sm w-full resize-none focus:outline-none"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        ) : (
          <input
            className="bg-primary-foreground/10 border border-primary-foreground/30 text-primary-foreground rounded px-2 py-1 text-sm w-full focus:outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        )}
        <span className="flex gap-1">
          <button
            onClick={save}
            className="p-0.5 rounded bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={cancel}
            className="p-0.5 rounded bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground/70"
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
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="opacity-0 group-hover/editable:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary-foreground/20 text-primary-foreground/60 hover:text-primary-foreground shrink-0 mt-0.5"
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
    <footer className="relative bg-primary text-primary-foreground border-t border-primary-foreground/10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
        aria-hidden
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-soft shrink-0">
                <Church className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="min-w-0 pt-0.5">
                <span className="font-display text-lg font-semibold tracking-tight block">
                  ICER Chapecó
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/55 block mt-0.5">
                  Casa de Oração
                </span>
              </div>
            </div>
            <p className="text-[15px] text-primary-foreground/75 leading-relaxed max-w-sm">
              <Txt field="footerDescricao" multiline />
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.14em] uppercase text-primary-foreground/45">
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
                  className="inline-flex items-center min-h-[44px] text-[15px] text-primary-foreground/75 hover:text-primary-foreground transition-colors rounded-lg py-2 -mx-1 px-2 hover:bg-primary-foreground/8"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.14em] uppercase text-primary-foreground/45">
              Contato
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 text-sm text-primary-foreground/70">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <Txt field="footerEndereco" />
              </div>
              <div className="flex items-center gap-2.5 text-sm text-primary-foreground/70">
                <Phone className="w-4 h-4 shrink-0" />
                <Txt field="footerTelefone" />
              </div>
              <div className="flex items-center gap-2.5 text-sm text-primary-foreground/70">
                <Mail className="w-4 h-4 shrink-0" />
                <Txt field="footerEmail" />
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="space-y-4">
            <h4 className="font-semibold text-xs tracking-[0.14em] uppercase text-primary-foreground/45">
              Horários
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 text-sm text-primary-foreground/70">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-primary-foreground">
                    <Txt field="footerHorario1Dia" />
                  </p>
                  <Txt field="footerHorario1Desc" />
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-primary-foreground/70">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-primary-foreground">
                    <Txt field="footerHorario2Dia" />
                  </p>
                  <Txt field="footerHorario2Desc" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center">
          <p className="text-xs text-primary-foreground/45">
            © {new Date().getFullYear()} ICER Chapecó. Todos os direitos
            reservados.
          </p>
          {canEditHome && (
            <p className="text-xs text-primary-foreground/35 mt-2 max-w-md mx-auto">
              Como administrador, pode apontar o rato sobre um texto e clicar no
              lápis para alterar.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

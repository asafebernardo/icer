import { X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { isValidAllowedEmail, splitAllowedEmails } from "@/lib/googleAllowedEmails";

/**
 * Editor de chips para e-mails autorizados ao login Google.
 * @param {{
 *   emails: string[];
 *   draft: string;
 *   onDraftChange: (value: string) => void;
 *   onEmailsChange: (next: string[]) => void;
 *   onAddEmail?: (email: string) => void | Promise<void>;
 *   onRemoveEmail?: (email: string) => void | Promise<void>;
 *   disabled?: boolean;
 *   id?: string;
 *   label?: string;
 *   hint?: string;
 * }} props
 */
export default function GoogleAllowedEmailsEditor({
  emails,
  draft,
  onDraftChange,
  onEmailsChange,
  onAddEmail,
  onRemoveEmail,
  disabled = false,
  id = "google-allowed-emails",
  label = "E-mails autorizados (login Google)",
  hint,
}) {
  const addLocal = (rawValue) => {
    const parts = splitAllowedEmails(rawValue);
    if (parts.length === 0) return;
    const invalid = parts.filter((email) => !isValidAllowedEmail(email));
    if (invalid.length > 0) {
      toast.error(`E-mail inválido: ${invalid[0]}`);
      return;
    }
    const seen = new Set(emails);
    const next = [...emails];
    let duplicates = 0;
    for (const email of parts) {
      if (seen.has(email)) {
        duplicates += 1;
        continue;
      }
      seen.add(email);
      next.push(email);
    }
    if (duplicates > 0) toast.info("E-mail duplicado ignorado.");
    onEmailsChange(next);
    onDraftChange("");
  };

  const handleInput = (value) => {
    if (/[,;\s]/.test(value)) {
      addLocal(value);
      return;
    }
    onDraftChange(value.toLowerCase());
  };

  const commitDraft = async () => {
    const parts = splitAllowedEmails(draft);
    if (parts.length === 0) return;
    const email = parts[0];
    if (!isValidAllowedEmail(email)) {
      toast.error(`E-mail inválido: ${email}`);
      return;
    }
    if (onAddEmail) {
      await onAddEmail(email);
      return;
    }
    addLocal(draft);
  };

  const handleRemove = async (email) => {
    if (onRemoveEmail) {
      await onRemoveEmail(email);
      return;
    }
    onEmailsChange(emails.filter((item) => item !== email));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="rounded-md border border-input bg-background px-3 py-2">
        <div className="flex min-h-10 flex-wrap items-center gap-2">
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {email}
              <button
                type="button"
                disabled={disabled}
                onClick={() => void handleRemove(email)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
                aria-label={`Remover ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id={id}
            value={draft}
            disabled={disabled}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === ";") {
                e.preventDefault();
                void commitDraft();
              } else if (e.key === "Backspace" && !draft && emails.length > 0) {
                void handleRemove(emails[emails.length - 1]);
              }
            }}
            onBlur={() => void commitDraft()}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/[,;\s]/.test(text)) {
                e.preventDefault();
                addLocal(text);
              }
            }}
            placeholder={
              emails.length === 0 ? "email@gmail.com, outro@gmail.com" : ""
            }
            className="min-w-[13rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            autoComplete="off"
          />
        </div>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

import { cn } from "@/lib/utils";
import { CATEGORIA_ICON_OPTIONS, categoriaIconComponent } from "./materiaisConfig";

/**
 * Seleção de um único ícone (Lucide) para o material.
 * @param {string} [value] — id do ícone ou vazio para usar só o ícone do tipo de ficheiro
 * @param {(id: string) => void} onChange
 */
export function MaterialIconPicker({ value, onChange, className }) {
  const ClearIcon = categoriaIconComponent("");
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          title="Padrão (ícone do tipo de ficheiro)"
          onClick={() => onChange("")}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
            !value
              ? "border-accent bg-accent/15 text-accent"
              : "border-border bg-muted/40 text-muted-foreground hover:border-accent/50",
          )}
        >
          <ClearIcon className="h-5 w-5 opacity-70" />
        </button>
        {CATEGORIA_ICON_OPTIONS.map(({ id, Icon, label }) => {
          const isOn = value === id;
          return (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => onChange(id)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                isOn
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-accent/50 hover:bg-muted",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";

/**
 * Botão "Trocar fundo" — o pai controla visibilidade e o handler do ficheiro.
 * @param {() => void} [onClear] — opcional: remover imagem de fundo guardada
 * @param {boolean} [hasBackground] — mostrar "Remover imagem" quando há URL
 */
export default function AdminPageBgButton({
  visible,
  onSelectFile,
  onClear,
  hasBackground = false,
  className = "",
  variant = "outline",
  lightOnDark = true,
}) {
  const inputRef = useRef(null);
  if (!visible || typeof onSelectFile !== "function") return null;

  const btnClass = lightOnDark
    ? "border-white/50 bg-white/10 text-white shadow-sm backdrop-blur-sm hover:bg-white/20"
    : "";

  const clearClass = lightOnDark
    ? "border-white/40 bg-white/5 text-white/90 backdrop-blur-sm hover:bg-white/15"
    : "";

  return (
    <div className={`pointer-events-auto flex flex-wrap items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelectFile(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant={variant}
        className={btnClass}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="w-4 h-4 mr-2" />
        Trocar fundo
      </Button>
      {hasBackground && typeof onClear === "function" ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={clearClass}
          onClick={onClear}
        >
          Remover imagem
        </Button>
      ) : null}
    </div>
  );
}

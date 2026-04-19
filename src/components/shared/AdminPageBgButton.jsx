import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";

/**
 * Botão "Trocar fundo" — o pai controla visibilidade e o handler do ficheiro.
 */
export default function AdminPageBgButton({
  visible,
  onSelectFile,
  className = "",
  variant = "outline",
  lightOnDark = true,
}) {
  const inputRef = useRef(null);
  if (!visible || typeof onSelectFile !== "function") return null;

  const btnClass = lightOnDark
    ? "border-white/50 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm shadow-sm"
    : "";

  return (
    <div className={`pointer-events-auto ${className}`}>
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
    </div>
  );
}

import { useState, useEffect } from "react";
import { uploadIntegrationFile } from "@/lib/uploadImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidMaterialIconId } from "./materiaisConfig";
import { MaterialIconPicker } from "./MaterialIconPicker";

const TIPO_OPTIONS = [
  "pdf",
  "audio",
  "video",
  "imagem",
  "documento",
  "apresentacao",
];

/**
 * Formulário enxuto: título + tipo + ícone (opcional) + arquivo.
 * Descrição, categoria e imagem de capa foram removidas da UI; campos legados
 * existentes em registos antigos são preservados.
 */
export function MaterialForm({ material, onSave, onCancel, inDialog }) {
  const [form, setForm] = useState({
    titulo: material?.titulo || "",
    tipo: material?.tipo || "pdf",
    icone_id: material?.icone_id || "",
    arquivo_url: material?.arquivo_url || "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm({
      titulo: material?.titulo || "",
      tipo: material?.tipo || "pdf",
      icone_id: material?.icone_id || "",
      arquivo_url: material?.arquivo_url || "",
    });
  }, [material?.id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadIntegrationFile(file);
      setForm((f) => ({ ...f, arquivo_url: file_url }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = () => {
    const rawIcon = String(form.icone_id || "").trim();
    const base = {
      // Preserva campos legados (categoria, descrição, imagem) se já existirem.
      ...(material || {}),
      ...form,
      icone_id: rawIcon && isValidMaterialIconId(rawIcon) ? rawIcon : null,
    };
    onSave(base);
  };

  return (
    <div
      className={cn(
        "space-y-4",
        !inDialog && "bg-card border border-border rounded-2xl p-6 mb-6",
      )}
    >
      {!inDialog && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            {material ? "Editar Material" : "Novo Material"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Input
        placeholder="Título *"
        value={form.titulo}
        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
      />

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Tipo
        </label>
        <Select
          value={form.tipo}
          onValueChange={(v) => setForm({ ...form, tipo: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPO_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Ícone (opcional)
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Se não escolher, usa-se o ícone do tipo de ficheiro.
          </p>
        </div>
        <MaterialIconPicker
          value={form.icone_id}
          onChange={(id) => setForm((f) => ({ ...f, icone_id: id }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Arquivo
        </label>
        <label
          className={`flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-xl p-4 hover:border-accent/50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading
              ? "Enviando..."
              : form.arquivo_url
                ? "Arquivo enviado ✓"
                : "Clique para enviar arquivo"}
          </span>
          <input type="file" className="hidden" onChange={handleFileUpload} />
        </label>
        {form.arquivo_url ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 text-destructive hover:text-destructive"
            onClick={() => setForm((f) => ({ ...f, arquivo_url: "" }))}
          >
            Remover arquivo
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="success" onClick={submit} disabled={!form.titulo}>
          Salvar
        </Button>
      </div>
    </div>
  );
}

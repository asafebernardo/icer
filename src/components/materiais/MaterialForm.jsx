import { useState, useEffect } from "react";
import { uploadImageFile, uploadIntegrationFile } from "@/lib/uploadImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSiteConfig } from "@/lib/siteConfig";
import {
  materialCategorias,
  getMergedCategoriaIconIds,
  categoriaIconComponent,
} from "./materiaisConfig";

export function MaterialForm({ material, onSave, onCancel, inDialog }) {
  const [siteCfgTick, setSiteCfgTick] = useState(0);
  const [form, setForm] = useState({
    titulo: material?.titulo || "",
    descricao: material?.descricao || "",
    tipo: material?.tipo || "pdf",
    categoria: material?.categoria || "estudo",
    arquivo_url: material?.arquivo_url || "",
    imagem_url: material?.imagem_url || "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    setForm({
      titulo: material?.titulo || "",
      descricao: material?.descricao || "",
      tipo: material?.tipo || "pdf",
      categoria: material?.categoria || "estudo",
      arquivo_url: material?.arquivo_url || "",
      imagem_url: material?.imagem_url || "",
    });
  }, [material]);

  useEffect(() => {
    const fn = () => setSiteCfgTick((n) => n + 1);
    window.addEventListener("icer-site-config", fn);
    return () => window.removeEventListener("icer-site-config", fn);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadIntegrationFile(file);
    setForm((f) => ({ ...f, arquivo_url: file_url }));
    setUploading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const { file_url } = await uploadImageFile(file);
      setForm((f) => ({ ...f, imagem_url: file_url }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  void siteCfgTick;
  const categoriaIconIds = getMergedCategoriaIconIds(getSiteConfig());
  const CategoriaPreviewIcon = categoriaIconComponent(
    categoriaIconIds[form.categoria],
  );

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
      <Textarea
        placeholder="Descrição"
        value={form.descricao}
        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        className="h-20 resize-none"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          value={form.tipo}
          onValueChange={(v) => setForm({ ...form, tipo: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {[
              "pdf",
              "audio",
              "video",
              "imagem",
              "documento",
              "apresentacao",
            ].map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40"
            title="Ícone da categoria (configurável em «Ícones por categoria»)"
          >
            <CategoriaPreviewIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <Select
            value={form.categoria}
            onValueChange={(v) => setForm({ ...form, categoria: v })}
          >
            <SelectTrigger className="min-w-0 flex-1">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(materialCategorias).map(([k, v]) => {
                const OptIcon = categoriaIconComponent(categoriaIconIds[k]);
                return (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center gap-2">
                      <OptIcon className="h-4 w-4 shrink-0 opacity-80" />
                      {v}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
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
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Imagem de capa
        </label>
        <label
          className={`flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-xl p-4 hover:border-accent/50 transition-colors ${uploadingImg ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploadingImg
              ? "Enviando..."
              : form.imagem_url
                ? "Imagem enviada ✓"
                : "Clique para enviar imagem"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>
        {form.imagem_url && (
          <img
            src={form.imagem_url}
            alt=""
            className="mt-2 h-16 rounded-lg object-cover"
          />
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="success"
          onClick={() => onSave(form)}
          disabled={!form.titulo}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

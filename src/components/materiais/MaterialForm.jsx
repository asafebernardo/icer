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
import { X, Upload, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSiteConfig, setSiteConfig } from "@/lib/siteConfig";
import {
  SEM_CATEGORIA_ID,
  getMaterialCategoriasList,
  normalizeMaterialCategoriaForSave,
  isValidMaterialIconId,
} from "./materiaisConfig";
import { MaterialIconPicker } from "./MaterialIconPicker";
import MaterialCategoriasManager from "./MaterialCategoriasManager";

export function MaterialForm({ material, onSave, onCancel, inDialog }) {
  const [siteCfgTick, setSiteCfgTick] = useState(0);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [form, setForm] = useState({
    titulo: material?.titulo || "",
    descricao: material?.descricao || "",
    tipo: material?.tipo || "pdf",
    categoria: material?.categoria || SEM_CATEGORIA_ID,
    icone_id: material?.icone_id || "",
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
      categoria: material?.categoria || SEM_CATEGORIA_ID,
      icone_id: material?.icone_id || "",
      arquivo_url: material?.arquivo_url || "",
      imagem_url: material?.imagem_url || "",
    });
  }, [material?.id]);

  useEffect(() => {
    const fn = () => setSiteCfgTick((n) => n + 1);
    window.addEventListener("icer-site-config", fn);
    return () => window.removeEventListener("icer-site-config", fn);
  }, []);

  useEffect(() => {
    const cfg = getSiteConfig();
    if (cfg.materialCategoriasDef == null) {
      setSiteConfig({
        materialCategoriasDef: getMaterialCategoriasList(cfg),
      });
      setSiteCfgTick((n) => n + 1);
    }
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
  const cfg = getSiteConfig();
  const categorias = getMaterialCategoriasList(cfg);
  const categoriaSelectValue = categorias.some((c) => c.id === form.categoria)
    ? form.categoria
    : SEM_CATEGORIA_ID;

  const submit = () => {
    const cfgNow = getSiteConfig();
    const base = {
      ...form,
      categoria: normalizeMaterialCategoriaForSave(form.categoria, cfgNow),
    };
    const rawIcon = String(form.icone_id || "").trim();
    if (rawIcon && isValidMaterialIconId(rawIcon)) {
      base.icone_id = rawIcon;
    } else {
      base.icone_id = null;
    }
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
      <Textarea
        placeholder="Descrição"
        value={form.descricao}
        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        className="h-20 resize-none"
      />

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Categoria do material
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Escolha a categoria ou crie novas em «Gerir categorias».
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => setCatManagerOpen(true)}
          >
            <Settings2 className="w-4 h-4" />
            Gerir categorias
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tipo de ficheiro
            </label>
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
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Categoria
            </label>
            <Select
              value={categoriaSelectValue}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, categoria: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Ícone do material
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Opcional. Se não escolher, usa-se o ícone do tipo de ficheiro. O
            mesmo conjunto serve para qualquer categoria.
          </p>
        </div>
        <MaterialIconPicker
          value={form.icone_id}
          onChange={(id) => setForm((f) => ({ ...f, icone_id: id }))}
        />
      </div>

      <MaterialCategoriasManager
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
      />

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
        {form.imagem_url ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <img
              src={form.imagem_url}
              alt=""
              className="h-16 rounded-lg object-cover border border-border"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, imagem_url: "" }))}
            >
              Remover imagem
            </Button>
          </div>
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

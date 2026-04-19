import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LinkCardIcon } from "./LinkCardIcon";

export function UsefulLinkForm({ link, onSave, onCancel, inDialog }) {
  const [form, setForm] = useState({
    titulo: link?.titulo || "",
    url: link?.url || "",
    descricao: link?.descricao || "",
    categoria: link?.categoria || "Recursos",
    icone_url: link?.icone_url || "",
  });

  useEffect(() => {
    setForm({
      titulo: link?.titulo || "",
      url: link?.url || "",
      descricao: link?.descricao || "",
      categoria: link?.categoria || "Recursos",
      icone_url: link?.icone_url || "",
    });
  }, [link]);

  const previewLink = {
    url: form.url,
    icone_url: form.icone_url,
  };

  return (
    <div
      className={cn(
        "space-y-3",
        !inDialog && "bg-card border border-border rounded-2xl p-5 mb-4",
      )}
    >
      {!inDialog && (
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground text-sm">
            {link ? "Editar link" : "Novo link"}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      <Input
        placeholder="Título *"
        value={form.titulo}
        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
      />
      <Input
        placeholder="URL * (https://...)"
        value={form.url}
        onChange={(e) => setForm({ ...form, url: e.target.value })}
      />
      <div className="space-y-1.5">
        <Input
          placeholder="URL do ícone (opcional — PNG, JPG, ICO…)"
          value={form.icone_url}
          onChange={(e) => setForm({ ...form, icone_url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Se vazio, o ícone é o favicon do site (a partir do URL acima).
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <LinkCardIcon link={previewLink} />
          <span className="text-xs text-muted-foreground">
            {form.icone_url?.trim()
              ? "Pré-visualização do ícone personalizado"
              : "Pré-visualização do favicon automático"}
          </span>
          {form.icone_url?.trim() ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setForm({ ...form, icone_url: "" })}
            >
              Usar só favicon
            </Button>
          ) : null}
        </div>
      </div>
      <Input
        placeholder="Descrição"
        value={form.descricao}
        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
      />
      <Input
        placeholder="Categoria (ex: Bíblia, Estudos, Música...)"
        value={form.categoria}
        onChange={(e) => setForm({ ...form, categoria: e.target.value })}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          variant="success"
          className="gap-1"
          onClick={() =>
            onSave({
              ...form,
              icone_url: (form.icone_url || "").trim(),
            })
          }
          disabled={!form.titulo || !form.url}
        >
          <Save className="w-3.5 h-3.5" /> Salvar
        </Button>
      </div>
    </div>
  );
}

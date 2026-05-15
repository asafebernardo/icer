import fs from "fs";

const path = "src/pages/PostagemEditor.jsx";
let s = fs.readFileSync(path, "utf8");

const markerDesc =
  `          </div>\n\n          <div className="space-y-3 rounded-xl border border-border bg-muted/15 px-3 py-3">`;

const markerFiles = `\n\n          <div className="space-y-3">\n            <div className="space-y-2">\n              <Label>Arquivos (apenas imagens e vídeos)</Label>`;

const md = s.indexOf(markerDesc);
const mf = s.indexOf(markerFiles);

if (md < 0 || mf < 0) {
  console.error("markers not found", { md, mf });
  process.exit(1);
}

const galleryBlock = s.slice(md + "\n\n          ".length + `<div className="space-y-3 rounded-xl border border-border bg-muted/15 px-3 py-3">`.length, mf);

const step1TailAndStep2Open = `
          <div className="space-y-2">
            <Label htmlFor="post-data">Data da publicação *</Label>
            <Input
              id="post-data"
              type="datetime-local"
              value={dataPublicacao}
              onChange={(e) => setDataPublicacao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags (opcional)</Label>
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="Digite e pressione Enter ou vírgula…"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTagFromDraft();
                }
                if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
                  removeTagAt(tags.length - 1);
                }
              }}
              onBlur={() => addTagFromDraft()}
            />
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((t, idx) => {
                  const isEditing = editingTagIdx === idx;
                  return (
                    <span
                      key={\`\${normalizeTagKey(t)}-\${idx}\`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1"
                    >
                      {isEditing ? (
                        <input
                          value={editingTagDraft}
                          onChange={(e) => setEditingTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              commitEditTag();
                            }
                            if (e.key === "Escape") {
                              setEditingTagIdx(-1);
                              setEditingTagDraft("");
                            }
                          }}
                          onBlur={commitEditTag}
                          className="bg-transparent outline-none text-sm min-w-[6rem]"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditTag(idx)}
                          className="text-sm text-foreground hover:underline underline-offset-2"
                          title="Clique para editar"
                        >
                          {t}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTagAt(idx)}
                        className="w-5 h-5 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-destructive/10"
                        aria-label="Remover tag"
                        title="Remover"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
          </div>

          <div
            className={cn("space-y-4", step !== 2 && "hidden")}
            aria-hidden={step !== 2}
          >
`;

const firstPart = s.slice(0, md + markerDesc.length - `<div className="space-y-3 rounded-xl border border-border bg-muted/15 px-3 py-3">`.length);

const afterGalleryStart = md + markerDesc.length;
const galleryFullEnd = mf;

const fixedGallery = galleryBlock.replace(
  `Adicione imagens nos anexos (secção seguinte)`,
  `Adicione imagens na zona de arquivos acima`,
);

const reorderMarker =
  `                  </DragDropContext>\n                </div>\n              ) : null}\n              <div className="space-y-2">\n                <Label>Intervalo do carrossel (s)</Label>`;

const ri = fixedGallery.indexOf(reorderMarker);
if (ri < 0) {
  console.error("reorderMarker not inside gallery block — abort");
  process.exit(1);
}

const beforeReorderClose = fixedGallery.slice(0, ri);
const afterReorderClose = fixedGallery.slice(ri);

const galleryOnly =
  beforeReorderClose.trimEnd().replace(/\)\s*:\s*usarGaleriaPorDia\s*\?[\s\S]*$/, "").trimEnd();

console.error("script needs manual completion — gallery extraction ambiguous");

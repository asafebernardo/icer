import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createSong,
  deleteSong,
  listSongs,
  messageForSongError,
  updateSong,
} from "@/coletanea/api";
import LyricEditor from "@/coletanea/components/LyricEditor";
import { splitLyrics } from "@/coletanea/components/Lyrics";
import { filterSongs } from "@/coletanea/lib/songs";
import { packLyrics } from "@/coletanea/lib/voices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@/coletanea/coletanea.css";

const emptyForm = {
  titulo: "",
  letra: "",
  refrao: "",
  cronologica: false,
  refraoPrimeiro: false,
  vozesLetra: [],
  vozesRefrao: [],
};

function fieldsFromSong(song) {
  const embedded = splitLyrics(song.letra || "");
  const storedRefrao = String(song.refrao ?? "").trim();
  const refrao = storedRefrao || embedded.refrao;
  return {
    titulo: song.titulo || "",
    letra: storedRefrao ? song.letra || "" : embedded.letra,
    refrao,
    cronologica: Boolean(song.cronologica) && Boolean(refrao),
    refraoPrimeiro: Boolean(song.refraoPrimeiro) && Boolean(refrao),
    vozesLetra: Array.isArray(song.vozesLetra) ? song.vozesLetra : [],
    vozesRefrao: Array.isArray(song.vozesRefrao) ? song.vozesRefrao : [],
  };
}

export default function AdminColetaneaPanel() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [removing, setRemoving] = useState(false);

  const { data: songs = [], isLoading, isError } = useQuery({
    queryKey: ["coletanea-songs"],
    queryFn: async () => {
      const list = await listSongs();
      return Array.isArray(list) ? list : [];
    },
  });

  const filtered = useMemo(() => filterSongs(songs, query), [songs, query]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["coletanea-songs"] });

  const remove = async (song) => {
    setRemoving(true);
    try {
      await deleteSong(song.id);
      toast.success("Música marcada para eliminação.");
      setPendingDelete(null);
      if (editor?.id === song.id) setEditor(null);
      await refresh();
    } catch (error) {
      toast.error(messageForSongError(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">Coletânea</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Letras do aplicativo de louvor. O aplicativo no menu do site só lê este
          catálogo. Criar, editar e apagar fica neste painel.
        </p>
      </div>

      {editor ? (
        <SongEditor
          key={editor.id ?? "nova"}
          song={editor.id ? editor : null}
          onCancel={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await refresh();
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Número, título ou letra"
              aria-label="Pesquisar música da coletânea"
              type="search"
              className="sm:max-w-sm"
            />
            <Button type="button" className="sm:ml-auto" onClick={() => setEditor({ ...emptyForm })}>
              Nova música
            </Button>
          </div>

          {pendingDelete ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-foreground">
                Apagar <span className="font-medium">{pendingDelete.titulo}</span>? A música sai do
                aplicativo e pode ser restaurada em Eliminações.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={removing}
                  onClick={() => setPendingDelete(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={removing}
                  onClick={() => remove(pendingDelete)}
                >
                  {removing ? "Apagando…" : "Apagar"}
                </Button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar músicas…</p>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Não foi possível carregar a coletânea.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {songs.length === 0 ? "Nenhuma música ainda." : "Nenhum resultado."}
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {filtered.map((song) => (
                <li key={song.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                    {String(song.numero).padStart(3, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {song.titulo}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditor(song)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(song)}
                  >
                    Apagar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SongEditor({ song, onCancel, onSaved }) {
  const [form, setForm] = useState(() => (song ? fieldsFromSong(song) : emptyForm));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const letraPack = packLyrics(form.letra, form.vozesLetra);
    const refraoPack = packLyrics(form.refrao, form.vozesRefrao);
    const payload = {
      titulo: form.titulo.trim(),
      letra: letraPack.text,
      refrao: refraoPack.text,
      cronologica: Boolean(form.cronologica) && Boolean(refraoPack.text),
      refraoPrimeiro: Boolean(form.refraoPrimeiro) && Boolean(refraoPack.text),
      vozesLetra: letraPack.marks,
      vozesRefrao: refraoPack.marks,
    };
    try {
      if (song?.id) await updateSong(song.id, payload);
      else await createSong(payload);
      toast.success(song?.id ? "Música atualizada." : "Música criada.");
      await onSaved();
    } catch (err) {
      setError(messageForSongError(err));
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-1.5">
        <label className="block space-y-1.5" htmlFor="coletanea-titulo">
          <span className="text-xs font-medium text-muted-foreground">Título</span>
          <Input
            id="coletanea-titulo"
            value={form.titulo}
            onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
            maxLength={200}
            required
            placeholder="Título da música"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          O número segue a ordem alfabética do título e muda quando a coletânea muda.
        </p>
      </div>

      <div className="coletanea-app space-y-4 rounded-2xl p-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-cl-ink-soft">Letra</p>
          <LyricEditor
            label="Letra"
            text={form.letra}
            marks={form.vozesLetra}
            placeholder={"Primeira estrofe\n\nSegunda estrofe"}
            minClass="min-h-48"
            onChange={({ text, marks }) =>
              setForm((current) => ({ ...current, letra: text, vozesLetra: marks }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-center text-[0.78em] tracking-[0.16em] text-cl-ink-soft">Refrão</p>
          <LyricEditor
            label="Texto do refrão"
            text={form.refrao}
            marks={form.vozesRefrao}
            placeholder="Texto do refrão"
            italic
            onChange={({ text, marks }) =>
              setForm((current) => ({ ...current, refrao: text, vozesRefrao: marks }))
            }
          />
        </div>
      </div>

      {form.refrao.trim() ? (
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-xl border border-border px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={form.refraoPrimeiro}
              onChange={(event) =>
                setForm((current) => ({ ...current, refraoPrimeiro: event.target.checked }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Refrão primeiro</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                O refrão fica no topo. Com a ordem cronológica, ele também se repete depois de cada estrofe.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-border px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={form.cronologica}
              onChange={(event) =>
                setForm((current) => ({ ...current, cronologica: event.target.checked }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Ordem cronológica</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Permite repetir o refrão depois de cada estrofe. Quem lê liga ou desliga isso no aplicativo.
              </span>
            </span>
          </label>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

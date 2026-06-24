import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SOFT_DELETE_CONFIRM_DESCRIPTION } from "@/lib/softDeleteUi";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Igual ao servidor (`BUILTIN_ADMIN_GROUP_SLUG` em `permissionGroupDefaults.js`). */
const BUILTIN_ADMIN_GROUP_SLUG = "icer-builtin-admin";

/** Alinhado ao servidor (`defaultGroupPermissions` + UI de menus). */
const MENU_MATRIX = [
  { key: "home", label: "Início" },
  { key: "postagens", label: "Eventos" },
  { key: "recursos", label: "Recursos" },
  { key: "materiais_tab", label: "Recursos · materiais" },
  { key: "agenda", label: "Agenda" },
  { key: "eventos", label: "Eventos" },
  { key: "dashboard", label: "Minha área" },
  { key: "galeria", label: "Galeria" },
];

function defaultPermissions() {
  const o = {};
  for (const { key } of MENU_MATRIX) {
    o[key] = { create: true, edit: true, delete: true };
  }
  return o;
}

async function fetchGroups() {
  const r = await fetch("/api/admin/permission-groups", { credentials: "include" });
  if (!r.ok) {
    const t = await r.text();
    let msg = t;
    try {
      msg = JSON.parse(t).message || t;
    } catch {
      /* ignore */
    }
    throw new Error(msg || r.statusText);
  }
  return r.json();
}

function clonePerms(src) {
  const o = {};
  for (const { key } of MENU_MATRIX) {
    const b = src?.[key];
    o[key] = {
      create: b?.create !== false,
      edit: b?.edit !== false,
      delete: b?.delete !== false,
    };
  }
  return o;
}

export default function AdminPermissionGroupsPanel() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editRow, setEditRow] = useState(null);
  const [editPerms, setEditPerms] = useState(() => defaultPermissions());
  const [deleteRow, setDeleteRow] = useState(null);

  const listQuery = useQuery({
    queryKey: ["admin-permission-groups"],
    queryFn: fetchGroups,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/permission-groups", {
        method: "POST",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          permissions: defaultPermissions(),
        }),
      });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = { message: t };
      }
      if (!r.ok) throw new Error(data.message || r.statusText);
      return data;
    },
    onSuccess: () => {
      toast.success("Grupo criado.");
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      qc.invalidateQueries({ queryKey: ["admin-permission-groups"] });
    },
    onError: (e) => toast.error(e?.message || "Não foi possível criar."),
  });

  const saveMut = useMutation({
    mutationFn: async ({ id, name, description, permissions }) => {
      const r = await fetch(`/api/admin/permission-groups/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: await withCsrfHeaderAsync({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, description, permissions }),
      });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = { message: t };
      }
      if (!r.ok) throw new Error(data.message || r.statusText);
    },
    onSuccess: () => {
      toast.success("Grupo atualizado.");
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ["admin-permission-groups"] });
    },
    onError: (e) => toast.error(e?.message || "Não foi possível guardar."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/admin/permission-groups/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: await withCsrfHeaderAsync(),
      });
      const t = await r.text();
      let data = {};
      try {
        data = t ? JSON.parse(t) : {};
      } catch {
        data = { message: t };
      }
      if (!r.ok) {
        const code = data.message;
        if (code === "builtin_permission_group") {
          throw new Error("O grupo «Admin» incorporado não pode ser eliminado.");
        }
        throw new Error(code || r.statusText);
      }
    },
    onSuccess: () => {
      toast.success("Grupo eliminado.");
      setDeleteRow(null);
      qc.invalidateQueries({ queryKey: ["admin-permission-groups"] });
    },
    onError: (e) => toast.error(e?.message || "Não foi possível eliminar."),
  });

  const rows = listQuery.data ?? [];
  const sorted = useMemo(
    () => [...rows].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt")),
    [rows],
  );

  const openEdit = (g) => {
    setEditRow(g);
    setEditPerms(clonePerms(g.permissions));
  };

  const togglePerm = (menuKey, action, checked) => {
    setEditPerms((prev) => ({
      ...prev,
      [menuKey]: { ...prev[menuKey], [action]: checked },
    }));
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-900 shadow-sm dark:bg-indigo-500/28 dark:text-indigo-50">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Grupos de permissão
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Grupo Admin é fixo. Associe contas em Utilizadores; admins mantêm acesso total.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
            Atualizar
          </Button>
          <Button type="button" size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo grupo
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive">{listQuery.error?.message}</p>
        ) : sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ainda não há grupos. Crie um para associar utilizadores.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((g) => (
              <li
                key={g.id}
                className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{g.name}</p>
                  {g.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{g.description}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">id {g.id}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(g)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  {g.slug === BUILTIN_ADMIN_GROUP_SLUG ? (
                    <span className="self-center text-xs text-muted-foreground">Incorporado</span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteRow(g)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="pg-name">Nome</Label>
              <Input
                id="pg-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Equipa comunicação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-desc">Descrição (opcional)</Label>
              <Textarea
                id="pg-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                placeholder="Notas internas sobre quem usa este grupo."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              As permissões por menu começam todas ativas; edite o grupo depois para restringir.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!newName.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "A guardar…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editRow != null}
        onOpenChange={(o) => {
          if (!o) setEditRow(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[min(100vw-2rem,48rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar grupo — {editRow?.name}</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <EditGroupForm
              key={editRow.id}
              group={editRow}
              perms={editPerms}
              onToggle={togglePerm}
              onSave={(payload) =>
                saveMut.mutate({
                  id: editRow.id,
                  name: payload.name,
                  description: payload.description,
                  permissions: editPerms,
                })
              }
              busy={saveMut.isPending}
              onClose={() => setEditRow(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteRow != null} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteRow?.name}» será removido da lista activa. Só é possível se nenhum utilizador
              estiver associado. {SOFT_DELETE_CONFIRM_DESCRIPTION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMut.isPending || !deleteRow}
              onClick={() => deleteRow && deleteMut.mutate(deleteRow.id)}
            >
              {deleteMut.isPending ? "A eliminar…" : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditGroupForm({ group, perms, onToggle, onSave, busy, onClose }) {
  const [name, setName] = useState(group.name || "");
  const [description, setDescription] = useState(group.description || "");

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eg-name">Nome</Label>
          <Input id="eg-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="eg-desc">Descrição</Label>
          <Textarea
            id="eg-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Menu</th>
              <th className="px-2 py-2 text-center">Criar</th>
              <th className="px-2 py-2 text-center">Editar</th>
              <th className="px-2 py-2 text-center">Apagar</th>
            </tr>
          </thead>
          <tbody>
            {MENU_MATRIX.map((m) => (
              <tr key={m.key} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 text-foreground">{m.label}</td>
                {(["create", "edit", "delete"]).map((act) => (
                  <td key={act} className="px-2 py-2 text-center align-middle">
                    <Checkbox
                      checked={!!perms[m.key]?.[act]}
                      onCheckedChange={(v) => onToggle(m.key, act, v === true)}
                      aria-label={`${m.label} — ${act}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DialogFooter className="gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button
          type="button"
          disabled={!name.trim() || busy}
          onClick={() => onSave({ name: name.trim(), description: description.trim() })}
        >
          {busy ? "A guardar…" : "Guardar alterações"}
        </Button>
      </DialogFooter>
    </div>
  );
}

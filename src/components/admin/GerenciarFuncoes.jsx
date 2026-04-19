import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Save } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const funcoes = [
  { value: "membro", label: "Membro" },
  { value: "diácono", label: "Diácono" },
  { value: "presbítero", label: "Presbítero" },
  { value: "vice_presidente", label: "Vice Presidente" },
  { value: "presidente", label: "Presidente" },
];

export default function GerenciarFuncoes() {
  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.entities.User.list(),
  });

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleFuncaoChange = (userId, novaFuncao) => {
    setChanges((prev) => ({
      ...prev,
      [userId]: novaFuncao,
    }));
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    setSaving(true);
    try {
      for (const [userId, funcao] of Object.entries(changes)) {
        const user = users.find((u) => u.id === userId);
        if (user) {
          await api.entities.User.update(userId, { funcao });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setChanges({});
      toast.success("Funções atualizadas com sucesso");
    } catch (e) {
      toast.error(e?.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {Object.keys(changes).length > 0 && (
          <Button
            variant="success"
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="h-40 bg-muted rounded-xl animate-pulse" />
        ) : filteredUsers.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Nenhum membro encontrado
          </p>
        ) : (
          filteredUsers.map((user, idx) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-lg hover:border-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <Select
                value={changes[user.id] || user.funcao || "membro"}
                onValueChange={(valor) => handleFuncaoChange(user.id, valor)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {funcoes.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

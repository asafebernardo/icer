import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Home as HomeIcon,
  Newspaper,
  Calendar,
  CalendarDays,
  Library,
  ScrollText,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  CalendarPlus,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { isAdminUser } from "@/lib/auth";
import { listEventosMerged } from "@/lib/eventosQuery";

const NAV_ROUTES = [
  { label: "Início", path: "/Home", icon: HomeIcon },
  { label: "Postagens", path: "/Postagens", icon: Newspaper },
  { label: "Agenda", path: "/Agenda", icon: Calendar },
  { label: "Eventos", path: "/Eventos", icon: CalendarDays },
  { label: "Recursos", path: "/Recursos", icon: Library },
];

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const user = useSyncedAuthUser();
  const isLoggedIn = !!user;
  const isAdmin = isAdminUser(user);

  const { data: postsData } = useQuery({
    queryKey: ["cmdk", "posts"],
    queryFn: async () => {
      const r = await fetch(`/api/data/posts?limit=50&sort=-data`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) return { items: [] };
      return r.json();
    },
    enabled: open,
    staleTime: 60 * 1000,
  });

  const { data: eventos } = useQuery({
    queryKey: ["cmdk", "eventos"],
    queryFn: listEventosMerged,
    enabled: open,
    staleTime: 60 * 1000,
  });

  const posts = useMemo(
    () => (Array.isArray(postsData?.items) ? postsData.items : []),
    [postsData],
  );

  const runAndClose = (fn) => {
    onOpenChange?.(false);
    setTimeout(() => fn?.(), 0);
  };

  return (
    <CommandDialog open={!!open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Procurar páginas, posts e eventos…" />
      <CommandList>
        <CommandEmpty>Sem resultados.</CommandEmpty>

        <CommandGroup heading="Navegação">
          {NAV_ROUTES.map((r) => {
            const Icon = r.icon;
            return (
              <CommandItem
                key={r.path}
                value={`nav ${r.label}`}
                onSelect={() => runAndClose(() => navigate(r.path))}
              >
                <Icon className="mr-2" />
                <span>{r.label}</span>
              </CommandItem>
            );
          })}
          {isLoggedIn ? (
            <CommandItem
              value="nav painel"
              onSelect={() =>
                runAndClose(() => navigate(isAdmin ? "/Admin" : "/Dashboard"))
              }
            >
              {isAdmin ? (
                <ShieldCheck className="mr-2" />
              ) : (
                <LayoutDashboard className="mr-2" />
              )}
              <span>{isAdmin ? "Painel admin" : "Minha área"}</span>
            </CommandItem>
          ) : null}
        </CommandGroup>

        {posts.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Postagens">
              {posts.slice(0, 25).map((p) => (
                <CommandItem
                  key={`post-${p.id}`}
                  value={`post ${p.titulo || ""} ${(p.tags || []).join(" ")}`}
                  onSelect={() => runAndClose(() => navigate(`/Post/${p.id}`))}
                >
                  <FileText className="mr-2" />
                  <span className="truncate">{p.titulo || "(sem título)"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {Array.isArray(eventos) && eventos.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Eventos">
              {eventos.slice(0, 25).map((e) => (
                <CommandItem
                  key={`evento-${e.id}`}
                  value={`evento ${e.titulo || ""} ${e.local || ""} ${e.categoria || ""}`}
                  onSelect={() =>
                    runAndClose(() => navigate(`/Evento/${e.id}`))
                  }
                >
                  <CalendarPlus className="mr-2" />
                  <span className="truncate">
                    {e.titulo || "(sem título)"}
                    {e.data ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {e.data}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />
        <CommandGroup heading="Atalhos">
          <CommandItem
            value="atalho contato sobre"
            onSelect={() => runAndClose(() => navigate("/Home#contato"))}
          >
            <ScrollText className="mr-2" />
            <span>Contato</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Hook usado pelo Layout para abrir o CommandPalette (atalho global de teclado).
 */
export function useCommandPaletteShortcut(onToggle) {
  useEffect(() => {
    const handler = (e) => {
      const isK = e.key === "k" || e.key === "K";
      const isMod = e.metaKey || e.ctrlKey;
      if (isK && isMod) {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);
}

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  Newspaper,
  Calendar,
  CalendarDays,
  MoreHorizontal,
  Sun,
  Moon,
  User,
  Library,
  Search,
  Pencil,
  Settings,
  Users,
  Shield,
  History,
  Globe,
  ShieldAlert,
  ScrollText,
  BookMarked,
  Server,
  Sparkles,
  FileStack,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { useTheme } from "@/lib/ThemeContext";
import { useEditMode } from "@/lib/EditModeContext";
import { useAuth } from "@/lib/AuthContext";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { logout as authLogout, isAdminUser } from "@/lib/auth";
import { isServerAuthEnabled } from "@/lib/serverAuth";
import { cn } from "@/lib/utils";
import AdminNavLinks from "@/components/admin/AdminNavLinks";
import {
  DEFAULT_EXTRA_ADMIN_NAV_ITEMS,
  getAdminNavGroups,
} from "@/lib/adminNavConfig";

const PRIMARY_ITEMS = [
  { label: "Início", path: "/Home", icon: HomeIcon },
  { label: "Postagens", path: "/Postagens", icon: Newspaper },
  { label: "Agenda", path: "/Agenda", icon: Calendar },
  { label: "Eventos", path: "/Eventos", icon: CalendarDays },
];

export default function BottomNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  /** Menu expansível do painel admin na barra inferior (mobile). */
  const [adminDockOpen, setAdminDockOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { enabled: editMode, toggle: toggleEditMode } = useEditMode();
  const { navigateToLogin } = useAuth();
  const sessionUser = useSyncedAuthUser();
  const isLoggedIn = !!sessionUser;
  const isAdmin = isAdminUser(sessionUser);
  const canUseAdminTabs =
    isAdmin && isServerAuthEnabled() && sessionUser?._authSource === "server";
  const adminNavGroups = useMemo(
    () => getAdminNavGroups(DEFAULT_EXTRA_ADMIN_NAV_ITEMS),
    [],
  );
  const adminMenuIcons = useMemo(
    () => ({
      profile: Settings,
      "admin-users": Users,
      "permission-groups": Shield,
      "site-updates": History,
      site: Globe,
      google: Sparkles,
      server: Server,
      uploads: FileStack,
      "login-blocks": ShieldAlert,
      "audit-log": ScrollText,
      "cadastros-opcoes": BookMarked,
    }),
    [],
  );
  const adminTabHref = (id) =>
    id === "profile" ? "/Admin" : `/Admin?tab=${id}`;

  useEffect(() => {
    setAdminDockOpen(false);
  }, [location.pathname, location.search]);

  return (
    <>
      <nav
        aria-label="Navegação inferior"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul
          className={cn(
            "relative z-10 grid h-[64px]",
            isAdmin ? "grid-cols-6" : "grid-cols-5",
          )}
        >
          {PRIMARY_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path} className="contents">
                <Link
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    active
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="leading-none">{item.label}</span>
                </Link>
              </li>
            );
          })}
          {isAdmin ? (
            <li className="contents">
              <button
                type="button"
                onClick={() => {
                  setAdminDockOpen(false);
                  setOpen(true);
                }}
                aria-label="Mais"
                className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="leading-none">Mais</span>
              </button>
            </li>
          ) : null}
          {isAdmin ? (
            <li className="flex min-w-0 flex-col justify-stretch">
              <button
                type="button"
                id="bottom-nav-admin-dock-trigger"
                aria-expanded={adminDockOpen}
                aria-controls="bottom-nav-admin-dock-panel"
                onClick={() => {
                  setAdminDockOpen((v) => {
                    const next = !v;
                    if (next) setOpen(false);
                    return next;
                  });
                }}
                className={cn(
                  "flex h-full min-h-0 w-full flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-none transition-colors",
                  adminDockOpen
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Settings className="h-5 w-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate">Painel</span>
              </button>
            </li>
          ) : null}
          {!isAdmin ? (
            <li className="contents">
              <button
                type="button"
                onClick={() => {
                  setAdminDockOpen(false);
                  setOpen(true);
                }}
                aria-label="Mais"
                className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="leading-none">Mais</span>
              </button>
            </li>
          ) : null}
        </ul>

        {isAdmin && adminDockOpen ? (
          <>
            <button
              type="button"
              aria-label="Fechar menu do painel"
              className="fixed inset-0 z-[38] bg-black/30"
              onClick={() => setAdminDockOpen(false)}
            />
            <div
              id="bottom-nav-admin-dock-panel"
              role="region"
              aria-labelledby="bottom-nav-admin-dock-trigger"
              className="fixed inset-x-2 z-[45] max-h-[min(72vh,26rem)] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl"
              style={{
                bottom:
                  "calc(64px + env(safe-area-inset-bottom, 0px) + 0.5rem)",
              }}
            >
              <AdminNavLinks
                groups={adminNavGroups}
                canUseAdminTabs={canUseAdminTabs}
                icons={adminMenuIcons}
                layout="sheet"
                getHref={adminTabHref}
                onTabPick={() => setAdminDockOpen(false)}
              />
            </div>
          </>
        ) : null}
      </nav>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setAdminDockOpen(false);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-5 text-left">
            <SheetTitle>Mais opções</SheetTitle>
            <SheetDescription>Navegação e definições rápidas.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-1 divide-y divide-border">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                window.requestAnimationFrame(() => {
                  window.dispatchEvent(new Event("icer-open-cmdk"));
                });
              }}
              className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 text-left w-full"
            >
              <Search className="w-5 h-5 text-foreground/70" />
              <span className="text-base">Procurar</span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => toggleEditMode()}
                className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Pencil className="h-5 w-5 shrink-0 text-foreground/70" aria-hidden />
                  <span className="text-base">Modo de edição</span>
                </span>
                <span
                  aria-hidden
                  className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                    editMode ? "bg-accent dark:bg-accent" : "bg-muted dark:bg-white/15"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform dark:bg-white dark:shadow-md ${
                      editMode ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            ) : null}
            <SheetClose asChild>
              <Link
                to="/Recursos"
                className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50"
              >
                <Library className="w-5 h-5 text-foreground/70" />
                <span className="text-base">Recursos</span>
              </Link>
            </SheetClose>
            <button
              type="button"
              onClick={() => {
                toggle();
                setOpen(false);
              }}
              className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 text-left"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-foreground/70" />
              ) : (
                <Moon className="w-5 h-5 text-foreground/70" />
              )}
              <span className="text-base">
                {theme === "dark" ? "Tema claro" : "Tema escuro"}
              </span>
            </button>
            {isLoggedIn ? (
              <>
                {!isAdmin ? (
                  <SheetClose asChild>
                    <Link
                      to="/Dashboard"
                      className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50"
                    >
                      <User className="w-5 h-5 text-foreground/70" />
                      <span className="text-base">Minha área</span>
                    </Link>
                  </SheetClose>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    authLogout();
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 text-destructive text-left"
                >
                  <User className="w-5 h-5" />
                  <span className="text-base">Sair</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  navigateToLogin();
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 text-left"
              >
                <User className="w-5 h-5 text-foreground/70" />
                <span className="text-base">Entrar</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

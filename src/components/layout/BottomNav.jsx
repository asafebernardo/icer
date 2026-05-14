import { useState } from "react";
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
import { useAuth } from "@/lib/AuthContext";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { logout as authLogout, isAdminUser } from "@/lib/auth";

const PRIMARY_ITEMS = [
  { label: "Início", path: "/Home", icon: HomeIcon },
  { label: "Postagens", path: "/Postagens", icon: Newspaper },
  { label: "Agenda", path: "/Agenda", icon: Calendar },
  { label: "Eventos", path: "/Eventos", icon: CalendarDays },
];

export default function BottomNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { navigateToLogin } = useAuth();
  const sessionUser = useSyncedAuthUser();
  const isLoggedIn = !!sessionUser;
  const isAdmin = isAdminUser(sessionUser);

  return (
    <>
      <nav
        aria-label="Navegação inferior"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5 h-[64px]">
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
          <li className="contents">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Mais"
              className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="leading-none">Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-5 text-left">
            <SheetTitle>Mais opções</SheetTitle>
            <SheetDescription>Navegação e definições rápidas.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-1 divide-y divide-border">
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
                <SheetClose asChild>
                  <Link
                    to={isAdmin ? "/Admin" : "/Dashboard"}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50"
                  >
                    <User className="w-5 h-5 text-foreground/70" />
                    <span className="text-base">
                      {isAdmin ? "Painel admin" : "Minha área"}
                    </span>
                  </Link>
                </SheetClose>
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

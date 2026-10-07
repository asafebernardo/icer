import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  LogOut,
  Settings,
  Users,
  Shield,
  Globe,
  ScrollText,
  ChevronDown,
  BookMarked,
  Server,
  Sparkles,
  FileStack,
  Trash2,
  Moon,
  Sun,
  Pencil,
} from "lucide-react";
import { useEditMode } from "@/lib/EditModeContext";
import { useTheme } from "@/lib/ThemeContext";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { logout as authLogout, canUseEditMode, isAdminUser } from "@/lib/auth";
import useAdminNavAccess from "@/hooks/useAdminNavAccess";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import UserAvatar from "@/components/shared/UserAvatar";
import AdminNavLinks from "@/components/admin/AdminNavLinks";
import {
  DEFAULT_EXTRA_ADMIN_NAV_ITEMS,
  getAdminNavGroups,
} from "@/lib/adminNavConfig";
import { PRIMARY_NAV_LINKS } from "@/lib/primaryNavLinks";
import { cn } from "@/lib/utils";

function EditModeNavButton({ editMode, onToggle, className }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={editMode ? "Desactivar modo de edição" : "Activar modo de edição"}
      aria-pressed={editMode}
      title="Modo de edição"
      className={cn(
        "min-h-[40px] min-w-[40px] shrink-0 rounded-full",
        editMode
          ? "bg-accent/20 text-accent hover:bg-accent/30"
          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
        className,
      )}
    >
      <Pencil className="h-4 w-4" aria-hidden />
    </Button>
  );
}

function EditModeSheetRow({ editMode, onToggle }) {
  return (
    <div className="px-4 pb-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-2.5 text-left text-[14px] font-medium text-foreground transition-colors hover:bg-muted/40 min-w-0"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Pencil className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">Modo de edição</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
            editMode ? "bg-accent dark:bg-accent" : "bg-muted dark:bg-white/15",
          )}
        >
          <span
            className={cn(
              "inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform dark:bg-white dark:shadow-md",
              editMode ? "translate-x-3.5" : "translate-x-0.5",
            )}
          />
        </span>
      </button>
    </div>
  );
}

export default function NavAccountControls() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { enabled: editMode, toggle: toggleEditMode } = useEditMode();
  const { theme, toggleTheme } = useTheme();
  const sessionUser = useSyncedAuthUser();

  const isLoggedIn = !!sessionUser;
  const user = sessionUser;
  const isAdmin = isAdminUser(sessionUser);
  const canToggleEditMode = canUseEditMode(sessionUser);
  const {
    canUseAdminTabs,
    canNavigateAdminTabs,
    showHomologLoginBlockedHints,
  } = useAdminNavAccess(sessionUser);
  const accountAreaPath = isAdmin ? "/Admin" : "/Dashboard";
  const accountAreaLabel = isAdmin ? "Painel admin" : "Minha área";

  const adminNavGroups = useMemo(
    () => getAdminNavGroups(DEFAULT_EXTRA_ADMIN_NAV_ITEMS),
    [],
  );
  const adminContaGroup = useMemo(
    () => adminNavGroups.find((g) => g.id === "conta") ?? null,
    [adminNavGroups],
  );
  const adminAdministracaoGroup = useMemo(
    () => adminNavGroups.find((g) => g.id === "administracao") ?? null,
    [adminNavGroups],
  );
  const adminMenuIcons = useMemo(
    () => ({
      profile: Settings,
      "admin-users": Users,
      "permission-groups": Shield,
      site: Globe,
      google: Sparkles,
      server: Server,
      uploads: FileStack,
      "pending-deletions": Trash2,
      "audit-log": ScrollText,
      "cadastros-opcoes": BookMarked,
    }),
    [],
  );
  const adminTabHref = (id) => (id === "profile" ? "/Admin" : `/Admin?tab=${id}`);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema escuro"}
        title={theme === "dark" ? "Tema claro" : "Tema escuro"}
        className="min-h-[40px] min-w-[40px] shrink-0 rounded-full text-muted-foreground hover:bg-muted/30 hover:text-foreground"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )}
      </Button>
      {isLoggedIn && canToggleEditMode ? (
        <EditModeNavButton editMode={editMode} onToggle={toggleEditMode} />
      ) : null}
      {isLoggedIn ? (
        <div className="hidden lg:flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 rounded-lg text-muted-foreground hover:bg-muted/30 hover:text-foreground min-h-[40px] px-3"
              >
                <UserAvatar user={user} className="h-8 w-8" />
                <span className="text-sm font-medium max-w-[120px] truncate">
                  {user?.full_name || user?.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[13.5rem]">
              <DropdownMenuLabel className="truncate font-normal text-foreground">
                {user?.full_name || user?.email}
              </DropdownMenuLabel>
              {isAdmin ? (
                <>
                  <DropdownMenuSeparator />
                  <AdminNavLinks
                    groups={adminNavGroups}
                    canUseAdminTabs={canUseAdminTabs}
                    canNavigateAdminTabs={canNavigateAdminTabs}
                    showHomologLoginBlockedHints={showHomologLoginBlockedHints}
                    icons={adminMenuIcons}
                    layout="dropdown"
                    getHref={adminTabHref}
                  />
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to={accountAreaPath} className="flex items-center gap-2">
                    <UserAvatar user={user} className="h-7 w-7" />
                    <span>{accountAreaLabel}</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => authLogout()}
                className="flex cursor-pointer items-center gap-2 text-destructive"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <GoogleSignInButton size="sm" compact />
      )}

      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] hover:bg-muted/30"
              aria-label="Abrir menu"
            >
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[min(100vw-2rem,20rem)] border-l border-border/70 bg-background p-0 overflow-y-auto overflow-x-hidden"
          >
            <div className="pt-12 sm:pt-14">
              <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Navegação
              </p>
              <nav className="flex flex-col gap-1 overflow-x-hidden px-4" aria-label="Secções">
                {PRIMARY_NAV_LINKS.map((link) => {
                  const active = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "min-h-[44px] flex items-center px-4 py-2.5 text-[14px] font-medium rounded-xl transition-all duration-300",
                        active
                          ? "nav-link-pill-active"
                          : "text-foreground/80 hover:text-foreground hover:bg-foreground/5",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="mt-2 border-t border-border pt-2">
                  {isLoggedIn ? (
                    <div className="min-w-0">
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar user={user} className="h-11 w-11 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-foreground leading-tight">
                              {user?.full_name || "Conta"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      {isAdmin ? (
                        <div className="px-2 pb-2 min-w-0 flex flex-col gap-2">
                          {adminContaGroup ? (
                            <details className="group rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
                              <summary className="list-none cursor-pointer select-none flex min-h-[44px] items-center justify-between gap-2 px-4 py-2.5 text-[13px] font-semibold text-foreground border-b border-border/60 [&::-webkit-details-marker]:hidden">
                                <span>Conta</span>
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                              </summary>
                              <div className="px-2 py-2 max-h-[40vh] overflow-y-auto overflow-x-hidden">
                                <AdminNavLinks
                                  groups={[adminContaGroup]}
                                  canUseAdminTabs={canUseAdminTabs}
                                  canNavigateAdminTabs={canNavigateAdminTabs}
                                  showHomologLoginBlockedHints={showHomologLoginBlockedHints}
                                  icons={adminMenuIcons}
                                  layout="sheet"
                                  hideGroupTitles
                                  getHref={adminTabHref}
                                  onTabPick={() => setOpen(false)}
                                />
                              </div>
                            </details>
                          ) : null}
                          {adminAdministracaoGroup ? (
                            <details className="group rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
                              <summary className="list-none cursor-pointer select-none flex min-h-[44px] items-center justify-between gap-2 px-4 py-2.5 text-[13px] font-semibold text-foreground border-b border-border/60 [&::-webkit-details-marker]:hidden">
                                <span>Administração</span>
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                              </summary>
                              <div className="px-2 py-2 max-h-[40vh] overflow-y-auto overflow-x-hidden">
                                <AdminNavLinks
                                  groups={[adminAdministracaoGroup]}
                                  canUseAdminTabs={canUseAdminTabs}
                                  canNavigateAdminTabs={canNavigateAdminTabs}
                                  showHomologLoginBlockedHints={showHomologLoginBlockedHints}
                                  icons={adminMenuIcons}
                                  layout="sheet"
                                  hideGroupTitles
                                  getHref={adminTabHref}
                                  onTabPick={() => setOpen(false)}
                                />
                              </div>
                            </details>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <Link
                            to={accountAreaPath}
                            onClick={() => setOpen(false)}
                            className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground min-w-0"
                          >
                            <UserAvatar user={user} className="h-8 w-8 shrink-0" />
                            <span className="truncate">{accountAreaLabel}</span>
                          </Link>
                          {canToggleEditMode ? (
                            <EditModeSheetRow
                              editMode={editMode}
                              onToggle={toggleEditMode}
                            />
                          ) : null}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          authLogout();
                        }}
                        className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium text-destructive hover:bg-muted/80 min-w-0"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />{" "}
                        <span className="truncate">Sair</span>
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-2">
                      <GoogleSignInButton
                        className="w-full min-h-[44px] justify-center"
                        size="default"
                        onClick={() => setOpen(false)}
                      />
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

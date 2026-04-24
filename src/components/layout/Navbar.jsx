import { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Sun,
  Moon,
  X,
  User,
  LogOut,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

import {
  refreshPublicSiteConfig,
  savePublicSiteConfigAdmin,
  setSiteConfig,
} from "@/lib/siteConfig";
import { IMAGE_UPLOAD_RECOMMENDATION, imageFileToStorableUrl } from "@/lib/uploadImage";
import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import { canMenuAction, logout as authLogout, MENU, isAdminUser } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import SiteLogoMark, {
  useSiteLogoUrl,
} from "@/components/layout/SiteLogoMark";
import UserAvatar from "@/components/shared/UserAvatar";

// Menus base (sempre visíveis)
const BASE_LINKS = [
  { label: "Início", path: "/Home" },
  { label: "Postagens", path: "/Postagens" },
  { label: "Recursos", path: "/Recursos" },
  { label: "Agenda", path: "/Agenda" },
];

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { navigateToLogin } = useAuth();
  const sessionUser = useSyncedAuthUser();
  const logoInputRef = useRef(null);

  const isLoggedIn = !!sessionUser;
  const user = sessionUser;
  const canEditLogo = canMenuAction(sessionUser, MENU.HOME, "edit");
  const logoUrl = useSiteLogoUrl();
  const dashboardLinkLabel = isAdminUser(sessionUser) ? "Configurações" : "Minha área";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-xl backdrop-saturate-150 shadow-nav transition-colors duration-300 supports-[backdrop-filter]:bg-background/65"
      aria-label="Navegação principal"
    >
      <div className="container-page">
        <div className="flex items-center justify-between gap-2 min-h-[4.25rem] sm:min-h-[4.5rem] min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  void (async () => {
                    try {
                      const u = await imageFileToStorableUrl(f);
                      try {
                        await savePublicSiteConfigAdmin({ logoUrl: u });
                        await refreshPublicSiteConfig();
                      } catch {
                        setSiteConfig({ logoUrl: u });
                      }
                    } catch (err) {
                      console.warn(err);
                    }
                  })();
                }
                e.target.value = "";
              }}
            />
            <Link
              to="/Home"
              className="flex items-center gap-3 group min-w-0"
            >
              <SiteLogoMark
                imgClassName="h-9 w-auto max-h-10 max-w-[120px] sm:max-w-[200px] object-contain object-left group-hover:opacity-90 transition-opacity rounded-md"
              />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-display text-base sm:text-lg font-semibold text-foreground tracking-tight truncate">
                  ICER Chapecó
                </span>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground truncate">
                  Casa de Oração
                </span>
              </div>
            </Link>
            {canEditLogo && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title={`Editar — Logo do site. ${IMAGE_UPLOAD_RECOMMENDATION}`}
                  onClick={() => logoInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
                {logoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                    title="Remover logo"
                    onClick={() => {
                      savePublicSiteConfigAdmin({ logoUrl: "" })
                        .then(() => refreshPublicSiteConfig())
                        .catch(() => {
                          setSiteConfig({ logoUrl: "" });
                        });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Remover</span>
                  </Button>
                ) : null}
              </div>
            )}
          </div>

          {/* Desktop: navegação */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            {BASE_LINKS.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={active ? "page" : undefined}
                  className={`nav-link-pill ${
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Ações direita */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="rounded-lg text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
              aria-label={
                theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
              }
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {/* Logado: dropdown no nome | Deslogado: botão Login */}
            {isLoggedIn ? (
              <div className="hidden sm:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 rounded-lg text-muted-foreground hover:text-foreground min-h-[40px] px-3"
                    >
                      <UserAvatar user={user} className="h-8 w-8" />
                      <span className="text-sm font-medium max-w-[120px] truncate">
                        {user?.full_name || user?.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/Dashboard" className="flex items-center gap-2">
                        <UserAvatar user={user} className="h-7 w-7" />
                        <span>{dashboardLinkLabel}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => authLogout()}
                      className="flex items-center gap-2 text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex items-center gap-2 rounded-lg text-muted-foreground hover:text-foreground min-h-[40px] px-3"
                onClick={() => navigateToLogin()}
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Entrar</span>
              </Button>
            )}

            {/* Mobile menu */}
            <div className="lg:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    aria-label="Abrir menu"
                  >
                    {open ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Menu className="w-4 h-4" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[min(100vw-2rem,20rem)] pt-12 sm:pt-14 border-l border-border/60 bg-background/98 backdrop-blur-md"
                >
                  <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    Navegação
                  </p>
                  <nav className="flex flex-col gap-1" aria-label="Secções">
                    {BASE_LINKS.map((link) => {
                      const active = location.pathname === link.path;
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`min-h-[48px] flex items-center px-4 py-3 text-[15px] font-medium rounded-xl transition-all duration-200 ${
                            active
                              ? "bg-primary text-primary-foreground shadow-soft"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                    <div className="border-t border-border mt-2 pt-2">
                      {isLoggedIn ? (
                        <div>
                          <p className="px-4 py-1 text-xs text-muted-foreground truncate">
                            {user?.full_name || user?.email}
                          </p>
                          <Link
                            to="/Dashboard"
                            onClick={() => setOpen(false)}
                            className="w-full min-h-[48px] flex items-center gap-2 px-4 py-3 text-[15px] font-medium rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          >
                            <UserAvatar user={user} className="h-8 w-8" />
                            {dashboardLinkLabel}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              authLogout();
                            }}
                            className="w-full min-h-[48px] flex items-center gap-2 px-4 py-3 text-[15px] font-medium rounded-xl text-destructive hover:bg-muted/80"
                          >
                            <LogOut className="w-4 h-4" /> Sair
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            navigateToLogin();
                          }}
                          className="w-full min-h-[48px] flex items-center gap-2 px-4 py-3 text-[15px] font-medium rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        >
                          <User className="w-4 h-4" /> Entrar
                        </button>
                      )}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

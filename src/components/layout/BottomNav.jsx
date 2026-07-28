import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  Newspaper,
  Landmark,
  Church,
  Settings,
  Users,
  Shield,
  Globe,
  ScrollText,
  BookMarked,
  Server,
  Sparkles,
  FileStack,
  Trash2,
  Menu,
  X,
} from "lucide-react";

import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import useAdminNavAccess from "@/hooks/useAdminNavAccess";
import { isAdminUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { POSTS_HUB_LABEL, POSTS_HUB_PATH } from "@/lib/postsNavPath";
import AdminNavLinks from "@/components/admin/AdminNavLinks";
import BottomNavMenuActions from "@/components/layout/BottomNavMenuActions";
import {
  DEFAULT_EXTRA_ADMIN_NAV_ITEMS,
  getAdminNavGroups,
} from "@/lib/adminNavConfig";

const PRIMARY_ITEMS = [
  { label: "Início", path: "/Home", icon: HomeIcon },
  { label: "Cultos", path: "/Cultos", icon: Church },
  { label: POSTS_HUB_LABEL, path: POSTS_HUB_PATH, icon: Newspaper },
  { label: "História", path: "/Historia", icon: Landmark },
];

function isBottomNavActive(pathname, itemPath) {
  if (itemPath === POSTS_HUB_PATH) {
    return (
      pathname === itemPath || pathname.startsWith(`${itemPath}/`)
    );
  }
  if (itemPath === "/Home") {
    return pathname === "/Home" || pathname === "/";
  }
  return pathname === itemPath;
}

function BottomNavSheetLink({ item, active, onNavigate }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors",
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border/60 bg-card/60 text-foreground hover:border-border hover:bg-card",
      )}
    >
      <Icon className="h-6 w-6 shrink-0" aria-hidden />
      <span className="leading-none">{item.label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const sessionUser = useSyncedAuthUser();
  const isAdmin = isAdminUser(sessionUser);
  const {
    canUseAdminTabs,
    canNavigateAdminTabs,
    showHomologLoginBlockedHints,
  } = useAdminNavAccess(sessionUser);
  const adminNavGroups = useMemo(
    () => getAdminNavGroups(DEFAULT_EXTRA_ADMIN_NAV_ITEMS),
    [],
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
  const adminTabHref = (id) =>
    id === "profile" ? "/Admin" : `/Admin?tab=${id}`;

  const currentItem =
    PRIMARY_ITEMS.find((item) =>
      isBottomNavActive(location.pathname, item.path),
    ) ?? PRIMARY_ITEMS[0];
  const CurrentIcon = currentItem.icon;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          aria-label="Fechar menu de navegação"
          className="fixed inset-0 z-[38] bg-black/30 sm:hidden"
          onClick={closeMenu}
        />
      ) : null}

      <div
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto relative">
          {menuOpen ? (
            <div
              id="bottom-nav-menu-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bottom-nav-menu-trigger"
              className="absolute bottom-full left-1/2 z-[45] mb-3 w-[min(calc(100vw-2rem),20rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl max-h-[min(72vh,32rem)] overflow-y-auto"
            >
              <div className="border-b border-border/80 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Navegação
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                {PRIMARY_ITEMS.map((item) => (
                  <BottomNavSheetLink
                    key={item.path}
                    item={item}
                    active={isBottomNavActive(location.pathname, item.path)}
                    onNavigate={closeMenu}
                  />
                ))}
              </div>
              <div className="border-t border-border/80">
                <p className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Conta & preferências
                </p>
                <BottomNavMenuActions onAction={closeMenu} />
              </div>
              {isAdmin ? (
                <div className="border-t border-border/80 p-2">
                  <p className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Painel
                  </p>
                  <AdminNavLinks
                    groups={adminNavGroups}
                    canUseAdminTabs={canUseAdminTabs}
                    canNavigateAdminTabs={canNavigateAdminTabs}
                    showHomologLoginBlockedHints={showHomologLoginBlockedHints}
                    icons={adminMenuIcons}
                    layout="sheet"
                    getHref={adminTabHref}
                    onTabPick={closeMenu}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            id="bottom-nav-menu-trigger"
            aria-expanded={menuOpen}
            aria-controls="bottom-nav-menu-panel"
            aria-haspopup="dialog"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2.5 text-sm font-medium shadow-lg shadow-black/10 backdrop-blur-xl ring-1 ring-black/5 transition-[transform,background-color,border-color,color] duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              menuOpen ? "text-accent" : "text-foreground",
            )}
          >
            {menuOpen ? (
              <X className="h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <CurrentIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            )}
            <span className="max-w-[8rem] truncate">
              {menuOpen ? "Fechar" : currentItem.label}
            </span>
            {!menuOpen ? (
              <Menu className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
          </button>
        </div>
      </div>
    </>
  );
}

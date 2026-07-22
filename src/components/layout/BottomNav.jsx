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
  ShieldAlert,
  ScrollText,
  BookMarked,
  Server,
  Sparkles,
  FileStack,
} from "lucide-react";

import { useSyncedAuthUser } from "@/hooks/useSyncedAuthUser";
import useAdminNavAccess from "@/hooks/useAdminNavAccess";
import { isAdminUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { POSTS_HUB_LABEL, POSTS_HUB_PATH } from "@/lib/postsNavPath";
import AdminNavLinks from "@/components/admin/AdminNavLinks";
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

function BottomNavLink({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
        active
          ? "text-accent"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="leading-none">{item.label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const [adminDockOpen, setAdminDockOpen] = useState(false);
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
    <nav
      aria-label="Navegação inferior"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 dark:shadow-[0_-1px_0_hsl(var(--border)),0_-8px_32px_-12px_hsl(217_59%_4%/0.85)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className={cn(
          "relative z-10 grid h-[64px]",
          isAdmin ? "grid-cols-7" : "grid-cols-6",
        )}
      >
        {PRIMARY_ITEMS.map((item) => (
          <li key={item.path} className="contents">
            <BottomNavLink
              item={item}
              active={isBottomNavActive(location.pathname, item.path)}
            />
          </li>
        ))}
        {isAdmin ? (
          <li className="flex min-w-0 flex-col justify-stretch">
            <button
              type="button"
              id="bottom-nav-admin-dock-trigger"
              aria-expanded={adminDockOpen}
              aria-controls="bottom-nav-admin-dock-panel"
              onClick={() => setAdminDockOpen((v) => !v)}
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
              canNavigateAdminTabs={canNavigateAdminTabs}
              showHomologLoginBlockedHints={showHomologLoginBlockedHints}
              icons={adminMenuIcons}
              layout="sheet"
              getHref={adminTabHref}
              onTabPick={() => setAdminDockOpen(false)}
            />
          </div>
        </>
      ) : null}
    </nav>
  );
}

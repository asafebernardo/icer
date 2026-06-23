import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV_GROUP_MARKER,
  getAdminNavItemIconToneClass,
} from "@/lib/adminNavConfig";

function NavIconWrap({ Icon, itemId, isActive, disabled }) {
  if (!Icon) return null;
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
        disabled && "opacity-45 grayscale",
        isActive
          ? "bg-primary-foreground/20 text-primary-foreground"
          : getAdminNavItemIconToneClass(itemId),
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
    </span>
  );
}

function NavLabel({ item, loginBlocked = false }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="truncate">{item.label}</span>
      {item.comingSoon ? (
        <Badge
          variant="secondary"
          className="shrink-0 px-1.5 py-0 text-[10px] uppercase tracking-wide"
        >
          Em breve
        </Badge>
      ) : loginBlocked ? (
        <Badge
          variant="outline"
          className="shrink-0 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] uppercase tracking-wide text-amber-950 dark:text-amber-50"
        >
          Login
        </Badge>
      ) : item.badge ? (
        <Badge
          variant="secondary"
          className="shrink-0 px-1.5 py-0 text-[10px] uppercase tracking-wide"
        >
          {item.badge}
        </Badge>
      ) : null}
    </span>
  );
}

function itemDisabled(item, canUseAdminTabs, canNavigateAdminTabs) {
  if (!item?.requiresServerAuth) return false;
  const canNav = canNavigateAdminTabs ?? canUseAdminTabs;
  return !canNav;
}

function itemLoginBlocked(item, canUseAdminTabs, showHomologLoginBlockedHints) {
  return Boolean(
    showHomologLoginBlockedHints &&
      item?.requiresServerAuth &&
      !canUseAdminTabs,
  );
}

/**
 * Secções do painel admin (Conta + Administração), para Sheet ou dropdown.
 * @param {{
 *   groups: Array<{ id: string; label: string; items: Array<{ id: string; label: string; requiresServerAuth?: boolean; comingSoon?: boolean; badge?: string }> }>;
 *   activeTab?: string | null;
 *   canUseAdminTabs: boolean;
 *   canNavigateAdminTabs?: boolean;
 *   showHomologLoginBlockedHints?: boolean;
 *   icons?: Record<string, React.ComponentType<{ className?: string }>>;
 *   layout?: "sheet" | "dropdown";
 *   getHref?: (tabId: string) => string | null;
 *   onTabPick?: (tabId: string) => void;
 *   hideGroupTitles?: boolean;
 * }} props
 */
export default function AdminNavLinks({
  groups,
  activeTab = null,
  canUseAdminTabs,
  canNavigateAdminTabs,
  showHomologLoginBlockedHints = false,
  icons = {},
  layout = "sheet",
  getHref,
  onTabPick,
  hideGroupTitles = false,
}) {
  const location = useLocation();
  const tabFromUrl = new URLSearchParams(location.search).get("tab");

  const isItemActive = (itemId) => {
    if (activeTab != null) return activeTab === itemId;
    if (location.pathname !== "/Admin" && !location.pathname.endsWith("/Admin")) {
      return false;
    }
    if (itemId === "profile") return !tabFromUrl || tabFromUrl === "profile";
    if (itemId === "admin-users") {
      return tabFromUrl === "admin-users" || tabFromUrl === "members";
    }
    return tabFromUrl === itemId;
  };

  const sheetItemClass = (isActive, disabled) =>
    cn(
      "flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-[14px] font-medium transition-colors",
      disabled
        ? "cursor-not-allowed text-muted-foreground opacity-55"
        : isActive
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
    );

  const renderSheetRow = (item) => {
    const Icon = icons[item.id];
    if (item.comingSoon) {
      return (
        <span
          key={item.id}
          title="Em breve — indisponível"
          aria-disabled="true"
          className={cn(sheetItemClass(false, true), "select-none")}
        >
          <NavIconWrap Icon={Icon} itemId={item.id} isActive={false} disabled />
          <NavLabel item={item} />
        </span>
      );
    }
    const disabled = itemDisabled(item, canUseAdminTabs, canNavigateAdminTabs);
    const loginBlocked = itemLoginBlocked(
      item,
      canUseAdminTabs,
      showHomologLoginBlockedHints,
    );
    const isActive = isItemActive(item.id);
    const href = getHref?.(item.id) ?? null;

    if (!disabled && href) {
      return (
        <Link
          key={item.id}
          to={href}
          onClick={() => onTabPick?.(item.id)}
          title={
            loginBlocked
              ? "Homologação: aba visível; conteúdo exige sessão no servidor"
              : undefined
          }
          className={sheetItemClass(isActive, false)}
        >
          <NavIconWrap Icon={Icon} itemId={item.id} isActive={isActive} disabled={false} />
          <NavLabel item={item} loginBlocked={loginBlocked} />
        </Link>
      );
    }

    if (!disabled && !href) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabPick?.(item.id)}
          className={sheetItemClass(isActive, false)}
        >
          <NavIconWrap Icon={Icon} itemId={item.id} isActive={isActive} disabled={false} />
          <NavLabel item={item} loginBlocked={loginBlocked} />
        </button>
      );
    }

    return (
      <span
        key={item.id}
        title="Apenas com sessão no servidor (MongoDB)"
        className={sheetItemClass(false, true)}
      >
        <NavIconWrap Icon={Icon} itemId={item.id} isActive={false} disabled />
        <NavLabel item={item} />
      </span>
    );
  };

  const renderDropdownRow = (item) => {
    const Icon = icons[item.id];
    if (item.comingSoon) {
      return (
        <DropdownMenuItem
          key={item.id}
          disabled
          className="min-w-0 cursor-not-allowed gap-2 opacity-70"
          onSelect={(e) => e.preventDefault()}
        >
          <NavIconWrap Icon={Icon} itemId={item.id} isActive={false} disabled />
          <NavLabel item={item} />
        </DropdownMenuItem>
      );
    }
    const disabled = itemDisabled(item, canUseAdminTabs, canNavigateAdminTabs);
    const loginBlocked = itemLoginBlocked(
      item,
      canUseAdminTabs,
      showHomologLoginBlockedHints,
    );
    const href = getHref?.(item.id) ?? null;

    if (!disabled && href) {
      return (
        <DropdownMenuItem key={item.id} asChild>
          <Link
            to={href}
            onClick={() => onTabPick?.(item.id)}
            title={
              loginBlocked
                ? "Homologação: aba visível; conteúdo exige sessão no servidor"
                : undefined
            }
            className="flex min-w-0 w-full cursor-pointer items-center gap-2"
          >
            <NavIconWrap Icon={Icon} itemId={item.id} isActive={false} disabled={false} />
            <NavLabel item={item} loginBlocked={loginBlocked} />
          </Link>
        </DropdownMenuItem>
      );
    }

    if (!disabled && !href) {
      return (
        <DropdownMenuItem
          key={item.id}
          onClick={() => onTabPick?.(item.id)}
          className="flex cursor-pointer items-center gap-2"
        >
          <NavIconWrap Icon={Icon} itemId={item.id} isActive={false} disabled={false} />
          <NavLabel item={item} loginBlocked={loginBlocked} />
        </DropdownMenuItem>
      );
    }

    return (
      <DropdownMenuItem key={item.id} disabled className="gap-2 opacity-60">
        <NavIconWrap Icon={Icon} itemId={item.id} isActive={false} disabled />
        <NavLabel item={item} />
      </DropdownMenuItem>
    );
  };

  if (layout === "dropdown") {
    return (
      <>
        {groups.map((g, idx) => (
          <div key={g.id}>
            {idx > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  ADMIN_NAV_GROUP_MARKER[g.id] || "bg-muted-foreground/45",
                )}
              />
              {g.label}
            </DropdownMenuLabel>
            {g.items.map((item) => renderDropdownRow(item))}
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.id}>
          {!hideGroupTitles ? (
            <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  ADMIN_NAV_GROUP_MARKER[g.id] || "bg-muted-foreground/40",
                )}
              />
              {g.label}
            </p>
          ) : null}
          <div className="flex flex-col gap-1">{g.items.map((item) => renderSheetRow(item))}</div>
        </div>
      ))}
    </div>
  );
}

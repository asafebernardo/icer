import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   icon: any;
 *   requiresServerAuth?: boolean;
 * }} NavItem
 *
 * @typedef {{
 *   id: string;
 *   label: string;
 *   items: NavItem[];
 * }} NavGroup
 */

/**
 * @returns {NavGroup[]}
 */
function getGroups() {
  return [
    {
      id: "conta",
      label: "Conta",
      items: [
        { id: "profile", label: "Minha conta" },
        { id: "members", label: "Membros" },
      ],
    },
    {
      id: "administracao",
      label: "Administração",
      items: [
        { id: "site", label: "Site", requiresServerAuth: true },
        { id: "login-blocks", label: "Bloqueios", requiresServerAuth: true },
        { id: "audit-log", label: "Logs", requiresServerAuth: true },
        { id: "backup", label: "Backup (Beta)", requiresServerAuth: true },
        { id: "google", label: "Google", requiresServerAuth: true },
        { id: "2fa", label: "2FA", requiresServerAuth: true },
      ],
    },
  ];
}

function itemDisabled(item, canUseAdminTabs) {
  return item?.requiresServerAuth ? !canUseAdminTabs : false;
}

function itemTitle(item, canUseAdminTabs) {
  if (itemDisabled(item, canUseAdminTabs)) return "Apenas com auth no servidor";
  return undefined;
}

/**
 * Navegação do Dashboard (admin): sidebar desktop + accordion mobile.
 * @param {{
 *  active: string;
 *  onChange: (tabId: string) => void;
 *  canUseAdminTabs: boolean;
 *  icons: Record<string, any>;
 * }} props
 */
export default function DashboardAdminNav({
  active,
  onChange,
  canUseAdminTabs,
  icons,
}) {
  const groups = getGroups();

  const renderItem = (item) => {
    const Icon = icons?.[item.id];
    const disabled = itemDisabled(item, canUseAdminTabs);
    const isActive = active === item.id;
    return (
      <Button
        key={item.id}
        type="button"
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "w-full justify-start gap-2 rounded-xl",
          isActive
            ? "bg-primary text-primary-foreground hover:bg-primary/95"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
        )}
        disabled={disabled}
        title={itemTitle(item, canUseAdminTabs)}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onChange(item.id)}
      >
        {Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
        <span className="truncate">{item.label}</span>
      </Button>
    );
  };

  return (
    <div className="w-full lg:w-auto">
      {/* Mobile: accordion */}
      <div className="lg:hidden rounded-2xl border border-border bg-card p-3 mb-6">
        <Accordion type="multiple" className="w-full">
          {groups.map((g) => (
            <AccordionItem key={g.id} value={g.id} className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <span className="text-sm font-semibold text-foreground">
                  {g.label}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="flex flex-col gap-1">{g.items.map(renderItem)}</div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Desktop: sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-5 sticky top-[6rem]">
          {groups.map((g) => (
            <div key={g.id} className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground px-2">
                {g.label}
              </div>
              <div className="space-y-1">{g.items.map(renderItem)}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}


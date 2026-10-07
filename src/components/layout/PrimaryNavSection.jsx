import { Link, useLocation } from "react-router-dom";

import NavAccountControls from "@/components/layout/NavAccountControls";
import { isPrimaryNavActive, PRIMARY_NAV_LINKS } from "@/lib/primaryNavLinks";
import { cn } from "@/lib/utils";

export default function PrimaryNavSection() {
  const { pathname } = useLocation();

  return (
    <nav
      className="primary-nav-section hidden sm:block"
      aria-label="Secções do site"
    >
      <div className="container-page">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center py-1.5">
          <div aria-hidden />
          <ul className="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3">
            {PRIMARY_NAV_LINKS.map((link) => {
              const active = isPrimaryNavActive(pathname, link.path);
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex min-h-10 items-center whitespace-nowrap px-2 text-sm font-medium tracking-wide transition-colors focus-ring sm:px-2.5",
                      active
                        ? "text-foreground after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:bg-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end">
            <NavAccountControls />
          </div>
        </div>
      </div>
    </nav>
  );
}

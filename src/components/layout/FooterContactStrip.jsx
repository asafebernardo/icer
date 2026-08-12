import { Fragment } from "react";

import { buildContactLinks } from "@/lib/contactDetails";
import { cn } from "@/lib/utils";

const linkClass = cn(
  "text-muted-foreground transition-colors hover:text-foreground",
  "underline-offset-2 hover:underline",
);

/**
 * Uma linha compacta de contacto para o rodapé (texto clicável separado por ·).
 * @param {{ details: ReturnType<typeof import("@/lib/contactDetails").resolveSiteContactDetails> }} props
 */
export default function FooterContactStrip({ details }) {
  const links = buildContactLinks(details);

  if (!links.length) return null;

  const labelFor = (item) => {
    if (item.key === "instagram") return "Instagram";
    if (item.key === "email") return details.email;
    if (item.key === "whatsapp" || item.key === "phone") return details.telefone;
    if (item.key === "address") return details.endereco;
    return item.label;
  };

  return (
    <nav
      aria-label="Contacto"
      className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 px-2 text-[10px] leading-snug sm:text-[11px]"
    >
      {links.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 ? (
            <span aria-hidden className="text-muted-foreground/35">
              ·
            </span>
          ) : null}
          <a
            href={item.href}
            title={item.label}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            className={cn(
              linkClass,
              item.key === "address"
                ? "max-w-full whitespace-normal text-center break-words"
                : "max-w-[10.5rem] truncate sm:max-w-[14rem]",
            )}
          >
            {labelFor(item)}
          </a>
        </Fragment>
      ))}
    </nav>
  );
}

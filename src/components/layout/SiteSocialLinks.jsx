import { useEffect, useMemo, useState } from "react";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { getSiteConfig } from "@/lib/siteConfig";
import { resolveSocialLinksFromConfig } from "@/lib/socialLinks";
import { cn } from "@/lib/utils";

function WhatsappIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const linkBaseStructure =
  "inline-flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Cores próximas das marcas (ícone = `currentColor`). */
const BRAND_BTN_CLASS = {
  yt: "text-[#FF0000] hover:text-[#CC0000] hover:bg-red-500/12",
  ig: "text-[#E4405F] hover:text-[#C13584] hover:bg-pink-500/10",
  fb: "text-[#0866FF] hover:text-[#0654CC] hover:bg-blue-500/10",
  wa: "text-[#25D366] hover:text-[#1DA851] hover:bg-emerald-500/12",
};

/**
 * @param {{ variant: "header" | "footer" }} props
 */
export default function SiteSocialLinks({ variant }) {
  const [links, setLinks] = useState(() =>
    resolveSocialLinksFromConfig(getSiteConfig()),
  );

  useEffect(() => {
    const sync = () => setLinks(resolveSocialLinksFromConfig(getSiteConfig()));
    sync();
    window.addEventListener("icer-site-config", sync);
    return () => window.removeEventListener("icer-site-config", sync);
  }, []);

  const items = useMemo(() => {
    const out = [];
    if (links.youtube)
      out.push({
        key: "yt",
        href: links.youtube,
        label: "YouTube",
        Icon: Youtube,
        brandClass: BRAND_BTN_CLASS.yt,
      });
    if (links.instagram)
      out.push({
        key: "ig",
        href: links.instagram,
        label: "Instagram",
        Icon: Instagram,
        brandClass: BRAND_BTN_CLASS.ig,
      });
    if (links.facebook)
      out.push({
        key: "fb",
        href: links.facebook,
        label: "Facebook",
        Icon: Facebook,
        brandClass: BRAND_BTN_CLASS.fb,
      });
    if (links.whatsapp)
      out.push({
        key: "wa",
        href: links.whatsapp,
        label: "WhatsApp",
        Icon: WhatsappIcon,
        brandClass: BRAND_BTN_CLASS.wa,
      });
    return out;
  }, [links]);

  if (!items.length) return null;

  const iconClass = variant === "header" ? "w-4 h-4 shrink-0" : "w-5 h-5";

  if (variant === "header") {
    return (
      <div
        className="flex items-center gap-1 shrink-0"
        aria-label="Redes sociais"
      >
        {items.map(({ key, href, label, Icon, brandClass }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkBaseStructure, "shrink-0", brandClass)}
            aria-label={`Abrir ${label} (nova janela)`}
          >
            <Icon className={iconClass} />
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-display font-semibold text-xs tracking-[0.16em] uppercase text-muted-foreground">
        Redes sociais
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map(({ key, href, label, Icon, brandClass }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkBaseStructure, brandClass)}
            aria-label={`Abrir ${label} (nova janela)`}
          >
            <Icon className={iconClass} />
          </a>
        ))}
      </div>
    </div>
  );
}

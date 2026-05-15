import { User, ShieldCheck, ShieldOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Foto de perfil do utilizador (`avatar_url`) ou ícone por defeito.
 * Opcional: distintivo 2FA (sessão servidor) no canto inferior direito.
 *
 * @param {{
 *   user?: { avatar_url?: string | null; totp_enabled?: boolean; _authSource?: string } | null;
 *   className?: string;
 *   imgClassName?: string;
 *   fallbackClassName?: string;
 *   showTwoFactorBadge?: boolean | "auto"; // auto: só com sessão servidor; true/false força
 * }} props
 */
export default function UserAvatar({
  user,
  className,
  imgClassName,
  fallbackClassName,
  showTwoFactorBadge = "auto",
}) {
  const raw = user?.avatar_url != null ? String(user.avatar_url).trim() : "";
  const src = raw.length > 0 ? raw : null;

  const showBadge =
    showTwoFactorBadge === true ||
    (showTwoFactorBadge !== false &&
      showTwoFactorBadge === "auto" &&
      user?._authSource === "server");
  const twoFaOn = user?.totp_enabled === true;

  return (
    <span className={cn("relative inline-flex shrink-0 rounded-full", className)}>
      <Avatar className="h-full w-full">
        {src ? (
          <AvatarImage
            src={src}
            alt=""
            className={cn("object-cover", imgClassName)}
          />
        ) : null}
        <AvatarFallback
          className={cn(
            "rounded-full bg-muted text-muted-foreground",
            fallbackClassName,
          )}
        >
          <User className="w-[55%] h-[55%]" aria-hidden />
        </AvatarFallback>
      </Avatar>
      {showBadge ? (
        <span
          className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-[32%] min-h-[11px] max-h-[18px] w-[32%] min-w-[11px] max-w-[18px] items-center justify-center rounded-full bg-background text-[0] ring-2 ring-background shadow-sm"
          title={twoFaOn ? "2FA activo" : "2FA inactivo"}
          aria-label={twoFaOn ? "2FA activo" : "2FA inactivo"}
        >
          {twoFaOn ? (
            <ShieldCheck
              className="h-[72%] w-[72%] text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          ) : (
            <ShieldOff
              className="h-[68%] w-[68%] text-muted-foreground"
              aria-hidden
            />
          )}
        </span>
      ) : null}
    </span>
  );
}

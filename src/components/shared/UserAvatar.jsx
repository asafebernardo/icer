import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Foto de perfil do utilizador (`avatar_url`) ou ícone por defeito.
 * @param {{ avatar_url?: string | null }} [user]
 */
export default function UserAvatar({ user, className, imgClassName, fallbackClassName }) {
  const raw = user?.avatar_url != null ? String(user.avatar_url).trim() : "";
  const src = raw.length > 0 ? raw : null;

  return (
    <Avatar className={cn(className)}>
      {src ? (
        <AvatarImage
          src={src}
          alt=""
          className={cn("object-cover", imgClassName)}
        />
      ) : null}
      <AvatarFallback
        className={cn("rounded-full bg-muted text-muted-foreground", fallbackClassName)}
      >
        <User className="w-[55%] h-[55%]" aria-hidden />
      </AvatarFallback>
    </Avatar>
  );
}

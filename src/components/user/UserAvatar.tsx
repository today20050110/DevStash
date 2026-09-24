import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string | null;
  email: string;
  image: string | null;
  className?: string;
}

// "Brad Traversy" → "BT"；沒有名稱時退回 email 的第一個字
export function getInitials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * 有 image（GitHub 大頭貼）時顯示圖片；沒有，或圖片載入失敗時，
 * Radix Avatar 會改顯示縮寫。
 */
export function UserAvatar({ name, email, image, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-8 rounded-full", className)}>
      {image && <AvatarImage src={image} alt={name ?? email} />}
      <AvatarFallback className="rounded-full">
        {getInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}

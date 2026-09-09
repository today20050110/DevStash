import {
  Code,
  File,
  Image,
  Link,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

/**
 * `ItemType.icon` holds a lucide icon *name* rather than a component, so the
 * value survives a round trip through the database. This maps it back.
 */
const ICONS: Record<string, LucideIcon> = {
  Code,
  File,
  Image,
  Link,
  Sparkles,
  StickyNote,
  Terminal,
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? File;
}

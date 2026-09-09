import { createElement } from "react";
import type { LucideProps } from "lucide-react";

import { getIcon } from "@/lib/icons";

interface TypeIconProps extends LucideProps {
  /** The lucide icon name stored on `ItemType.icon`. */
  name: string;
}

/**
 * createElement rather than `const Icon = getIcon(name); <Icon />` — the latter
 * trips react-hooks/static-components, which cannot tell that getIcon only ever
 * returns a stable module-level component.
 */
export function TypeIcon({ name, ...props }: TypeIconProps) {
  return createElement(getIcon(name), props);
}

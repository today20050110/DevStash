import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckListProps {
  items: string[];
  className?: string;
}

export function CheckList({ items, className }: CheckListProps) {
  return (
    <ul className={cn("grid gap-3.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-[15px]">
          <Check className="mt-1 size-4 shrink-0 text-home-note" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

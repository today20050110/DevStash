import {
  ACCENT_CLASSES,
  PREVIEW_CARDS,
  PREVIEW_NAV,
} from "@/components/homepage/homepage-content";
import { cn } from "@/lib/utils";

export function DashboardPreview() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[88px_1fr] gap-3 sm:grid-cols-[112px_1fr]">
      <ul className="flex flex-col gap-1 border-r pr-3">
        {PREVIEW_NAV.map(({ label, accent }, index) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground sm:px-2 sm:text-xs",
              index === 0 && "bg-muted text-foreground",
            )}
          >
            <span className={cn("size-2 shrink-0 rounded-full", ACCENT_CLASSES[accent].dot)} />
            {label}
          </li>
        ))}
      </ul>
      <ul className="grid auto-rows-fr grid-cols-2 gap-2.5">
        {PREVIEW_CARDS.map(({ title, accent }) => (
          <li
            key={title}
            className={cn(
              "flex min-w-0 flex-col gap-1.5 rounded-lg border border-t-3 bg-muted/60 p-2.5",
              ACCENT_CLASSES[accent].topBorder,
            )}
          >
            <span className="truncate text-xs font-semibold">{title}</span>
            <span className="h-1.5 rounded-full bg-foreground/15" />
            <span className="h-1.5 w-3/5 rounded-full bg-foreground/15" />
          </li>
        ))}
      </ul>
    </div>
  );
}

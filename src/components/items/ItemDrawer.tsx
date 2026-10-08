"use client";

import type { ReactNode } from "react";
import { CalendarDays, Folder, Tag } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { ItemDrawerActions } from "@/components/items/ItemDrawerActions";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useItemDetail, type ItemDetailRequest } from "@/hooks/use-item-detail";
import { formatLongDate } from "@/lib/format";
import type { ItemDetail } from "@/types/items";

interface ItemDrawerProps {
  request: ItemDetailRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemDrawer({ request, open, onOpenChange }: ItemDrawerProps) {
  const { item, error, isLoading } = useItemDetail(request);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {item ? (
          <>
            <ItemDrawerHeader item={item} />
            <ItemDrawerActions item={item} />
            <ItemDrawerBody item={item} />
          </>
        ) : (
          <SheetHeader className="pr-12">
            {/* Radix 要求 Dialog 一定要有標題；載入中與錯誤時只給螢幕閱讀器 */}
            <SheetTitle className="sr-only">
              {isLoading ? "Loading item" : "Item unavailable"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Item details
            </SheetDescription>
            {isLoading ? (
              <ItemDrawerSkeleton />
            ) : (
              <p role="alert" className="pt-8 text-sm text-destructive">
                {error ?? "Failed to load item"}
              </p>
            )}
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ItemDrawerHeader({ item }: { item: ItemDetail }) {
  const { color, icon, name } = item.type;

  return (
    <SheetHeader className="flex-row items-start gap-3 pr-12">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
        // 色碼來自資料庫，同 ItemCard 以 inline style 套用
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
          color,
        }}
      >
        <TypeIcon name={icon} className="size-5" />
      </div>
      <div className="min-w-0 space-y-2">
        <SheetTitle className="text-lg font-semibold break-words">
          {item.title}
        </SheetTitle>
        <SheetDescription className="sr-only">{name} details</SheetDescription>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{name}</Badge>
          {item.language && <Badge variant="outline">{item.language}</Badge>}
        </div>
      </div>
    </SheetHeader>
  );
}

function ItemDrawerBody({ item }: { item: ItemDetail }) {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      {item.description && (
        <Section title="Description">
          <p>{item.description}</p>
        </Section>
      )}

      <ItemDrawerContent item={item} />

      {item.tags.length > 0 && (
        <Section title="Tags" icon={<Tag />}>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {item.collections.length > 0 && (
        <Section title="Collections" icon={<Folder />}>
          <div className="flex flex-wrap gap-1.5">
            {item.collections.map((collection) => (
              <Badge key={collection.id} variant="outline">
                {collection.name}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      <Section title="Details" icon={<CalendarDays />}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Created</dt>
          <dd className="text-right">{formatLongDate(item.createdAt)}</dd>
          <dt className="text-muted-foreground">Updated</dt>
          <dd className="text-right">{formatLongDate(item.updatedAt)}</dd>
        </dl>
      </Section>
    </div>
  );
}

/** 程式碼編輯器與各型別專屬的顯示之後再做；目前 TEXT 以等寬純文字、URL 以連結呈現 */
function ItemDrawerContent({ item }: { item: ItemDetail }) {
  if (item.type.kind === "URL") {
    if (!item.url) {
      return null;
    }
    return (
      <Section title="URL">
        {isHttpUrl(item.url) ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline-offset-4 hover:underline"
          >
            {item.url}
          </a>
        ) : (
          <p className="break-all">{item.url}</p>
        )}
      </Section>
    );
  }

  if (!item.content) {
    return null;
  }
  return (
    <Section title="Content">
      <pre className="max-h-[50vh] overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
        <code>{item.content}</code>
      </pre>
    </Section>
  );
}

/** url 是使用者輸入，javascript: 等其他 scheme 不能放進 href */
function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

interface SectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function ItemDrawerSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

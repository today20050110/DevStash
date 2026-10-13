import { Folder } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CollectionOption } from "@/types/collections";

interface CollectionSelectProps {
  /** 使用者所有未刪除的 collections，依名稱排序 */
  collections: CollectionOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

/**
 * item 表單的 Collections 欄位：可複選的清單。原生 checkbox，鍵盤操作與表單語意交給瀏覽器；
 * collection 多時清單限高捲動。新增 dialog 與 drawer 的編輯模式共用。
 */
export function CollectionSelect({
  collections,
  value,
  onChange,
  error,
}: CollectionSelectProps) {
  const selected = new Set(value);

  function toggle(id: string, checked: boolean) {
    onChange(
      checked ? [...value, id] : value.filter((selectedId) => selectedId !== id),
    );
  }

  return (
    <fieldset
      className="space-y-2"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? "item-collections-error" : undefined}
    >
      <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground [&_svg]:size-3.5">
        <Folder />
        Collections
        {value.length > 0 && (
          <span className="font-normal">({value.length} selected)</span>
        )}
      </legend>
      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No collections yet. Create one with New Collection.
        </p>
      ) : (
        <div
          className={cn(
            "max-h-40 overflow-y-auto rounded-lg border border-border p-1",
            error && "border-destructive",
          )}
        >
          {collections.map((collection) => (
            <label
              key={collection.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="checkbox"
                name="item-collections"
                value={collection.id}
                checked={selected.has(collection.id)}
                onChange={(event) =>
                  toggle(collection.id, event.target.checked)
                }
                className="size-4 accent-primary"
              />
              <span className="truncate">{collection.name}</span>
            </label>
          ))}
        </div>
      )}
      {error && (
        <p
          id="item-collections-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}

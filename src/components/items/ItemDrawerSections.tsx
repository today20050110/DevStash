import type { ReactNode } from "react";
import { CalendarDays, Folder, Tag } from "lucide-react";

import { CodeEditor } from "@/components/items/CodeEditor";
import { Badge } from "@/components/ui/badge";
import { getEditorLanguage } from "@/lib/code-language";
import { formatLongDate } from "@/lib/format";
import { getItemTypeFields } from "@/lib/item-fields";
import { isHttpUrl } from "@/lib/url";
import type { ItemDetail } from "@/types/items";

interface SectionProps {
  title: string;
  icon?: ReactNode;
  /** 標題對應的表單欄位 id；有的話標題渲染成 <label> */
  htmlFor?: string;
  children: ReactNode;
}

export function Section({ title, icon, htmlFor, children }: SectionProps) {
  const className =
    "flex items-center gap-1.5 text-sm font-medium text-muted-foreground [&_svg]:size-3.5";

  return (
    <section className="space-y-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={className}>
          {icon}
          {title}
        </label>
      ) : (
        <h3 className={className}>
          {icon}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

/** 檢視模式的內容區 */
export function ItemDrawerBody({ item }: { item: ItemDetail }) {
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

      <CollectionsSection item={item} />
      <DetailsSection item={item} />
    </div>
  );
}

/** snippets／commands 以唯讀的程式碼編輯器顯示，其他 TEXT 以等寬純文字、URL 以連結呈現 */
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
  if (getItemTypeFields(item.type).language) {
    const language = getEditorLanguage(item.type.slug, item.language);
    return (
      <Section title="Content">
        <CodeEditor
          value={item.content}
          language={language}
          languageLabel={item.language ?? language}
          ariaLabel="Content"
        />
      </Section>
    );
  }
  return (
    <Section title="Content">
      <pre className="max-h-[50vh] overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
        <code>{item.content}</code>
      </pre>
    </Section>
  );
}

/** 檢視與編輯模式共用；collections 另行管理，編輯模式下只顯示 */
export function CollectionsSection({ item }: { item: ItemDetail }) {
  if (item.collections.length === 0) {
    return null;
  }
  return (
    <Section title="Collections" icon={<Folder />}>
      <div className="flex flex-wrap gap-1.5">
        {item.collections.map((collection) => (
          <Badge key={collection.id} variant="outline">
            {collection.name}
          </Badge>
        ))}
      </div>
    </Section>
  );
}

export function DetailsSection({ item }: { item: ItemDetail }) {
  return (
    <Section title="Details" icon={<CalendarDays />}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Created</dt>
        <dd className="text-right">{formatLongDate(item.createdAt)}</dd>
        <dt className="text-muted-foreground">Updated</dt>
        <dd className="text-right">{formatLongDate(item.updatedAt)}</dd>
      </dl>
    </Section>
  );
}

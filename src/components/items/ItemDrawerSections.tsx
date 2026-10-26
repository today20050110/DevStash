import type { ReactNode } from "react";
import { CalendarDays, Download, FileIcon, Folder, Tag } from "lucide-react";

import { useIsPro } from "@/components/billing/PlanProvider";
import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { PromptContent } from "@/components/items/PromptContent";
import { TagLink } from "@/components/items/TagLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isExplainableType, OPTIMIZABLE_TYPE_SLUG } from "@/lib/ai-inputs";
import { getEditorLanguage } from "@/lib/code-language";
import { isImageMimeType } from "@/lib/file-types";
import { formatFileSize, formatLongDate } from "@/lib/format";
import { itemFileUrl } from "@/lib/item-api";
import { getItemTypeFields } from "@/lib/item-fields";
import { isHttpUrl } from "@/lib/url";
import type { ItemDetail } from "@/types/items";

interface SectionProps {
  title: string;
  icon?: ReactNode;
  /** 標題對應的表單欄位 id；有的話標題渲染成 <label> */
  htmlFor?: string;
  /** 標題列右側的動作（例如 Description 的 AI Generate 按鈕） */
  action?: ReactNode;
  children: ReactNode;
}

export function Section({
  title,
  icon,
  htmlFor,
  action,
  children,
}: SectionProps) {
  const className =
    "flex items-center gap-1.5 text-sm font-medium text-muted-foreground [&_svg]:size-3.5";
  const heading = htmlFor ? (
    <label htmlFor={htmlFor} className={className}>
      {icon}
      {title}
    </label>
  ) : (
    <h3 className={className}>
      {icon}
      {title}
    </h3>
  );

  return (
    <section className="space-y-2">
      {action ? (
        <div className="flex items-center justify-between gap-2">
          {heading}
          {action}
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}

/**
 * 檢視模式的內容區；onNavigate 在點了換頁的連結（標籤）時關閉 drawer，
 * onUseOptimizedPrompt 在採用 AI 優化的 prompt 時以新內容進入編輯模式
 */
export function ItemDrawerBody({
  item,
  onNavigate,
  onUseOptimizedPrompt,
}: {
  item: ItemDetail;
  onNavigate: () => void;
  onUseOptimizedPrompt: (content: string) => void;
}) {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      {item.description && (
        <Section title="Description">
          <p>{item.description}</p>
        </Section>
      )}

      <ItemDrawerContent
        item={item}
        onUseOptimizedPrompt={onUseOptimizedPrompt}
      />

      {item.tags.length > 0 && (
        <Section title="Tags" icon={<Tag />}>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <TagLink key={tag} name={tag} onClick={onNavigate} />
            ))}
          </div>
        </Section>
      )}

      <CollectionsSection item={item} />
      <DetailsSection item={item} />
    </div>
  );
}

/**
 * snippets／commands 以唯讀的程式碼編輯器顯示（附 AI 解說），notes／prompts 以 Markdown
 * （prompts 附 AI 優化），其他 TEXT 以等寬純文字、URL 以連結呈現
 */
function ItemDrawerContent({
  item,
  onUseOptimizedPrompt,
}: {
  item: ItemDetail;
  onUseOptimizedPrompt: (content: string) => void;
}) {
  const isPro = useIsPro();

  if (item.type.kind === "FILE") {
    return item.file ? <FileSection itemId={item.id} file={item.file} /> : null;
  }
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
  const fields = getItemTypeFields(item.type);
  if (fields.markdown) {
    return (
      <Section title="Content">
        {item.type.slug === OPTIMIZABLE_TYPE_SLUG ? (
          <PromptContent
            input={{ title: item.title, content: item.content }}
            isPro={isPro}
            onUseOptimized={onUseOptimizedPrompt}
          />
        ) : (
          <MarkdownEditor value={item.content} />
        )}
      </Section>
    );
  }
  if (fields.language) {
    const language = getEditorLanguage(item.type.slug, item.language);
    return (
      <Section title="Content">
        <CodeEditor
          value={item.content}
          language={language}
          languageLabel={item.language ?? language}
          ariaLabel="Content"
          explain={
            isExplainableType(item.type.slug)
              ? {
                  type: item.type.slug,
                  title: item.title,
                  language: item.language ?? "",
                  content: item.content,
                }
              : undefined
          }
          isPro={isPro}
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

/**
 * FILE kind：圖片顯示預覽，其他檔案顯示檔案資訊；兩者都有下載按鈕。
 * 預覽與下載都經 /api/items/[id]/file（驗證擁有者，bucket 不公開）。
 */
function FileSection({
  itemId,
  file,
}: {
  itemId: string;
  file: NonNullable<ItemDetail["file"]>;
}) {
  const src = itemFileUrl(itemId);
  const isImage = isImageMimeType(file.mimeType);

  return (
    <Section title={isImage ? "Image" : "File"}>
      <div className="overflow-hidden rounded-lg border bg-muted/40">
        {isImage && (
          // 使用者上傳的檔案經驗證過的 API 讀取，next/image 的最佳化不適用
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={file.name}
            className="mx-auto block max-h-80 w-auto max-w-full border-b bg-background object-contain"
          />
        )}
        <div className="flex items-center gap-3 p-3">
          <FileIcon className="size-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)} · {file.mimeType}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            {/* download 屬性讓同源網址直接下載；伺服器端也以 attachment 回應 */}
            <a href={src} download={file.name}>
              <Download />
              Download
            </a>
          </Button>
        </div>
      </div>
    </Section>
  );
}

/** 檢視模式的 collections；編輯模式改用 CollectionSelect */
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

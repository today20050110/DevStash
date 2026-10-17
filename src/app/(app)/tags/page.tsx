import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Tag } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { getCurrentUserId } from "@/lib/current-user";
import { getTagsWithCounts } from "@/lib/db/tags";
import { NARROW_PAGE_CLASS } from "@/lib/page-width";
import { tagHref } from "@/lib/tags";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tags — DevStash",
};

async function getTags() {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/tags`);
  }
  return getTagsWithCounts(userId);
}

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <div className={cn(NARROW_PAGE_CLASS, "space-y-8")}>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Tags</h1>
        <p className="text-muted-foreground">
          {tags.length} {tags.length === 1 ? "tag" : "tags"}, most used first
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-y py-16 text-center">
          <Tag className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">No tags yet</p>
          <p className="text-sm text-muted-foreground">
            Add tags when you create or edit an item.
          </p>
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag.slug}>
              <Link
                href={tagHref(tag.name)}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span>#{tag.name}</span>
                <span className="text-xs text-muted-foreground">
                  {tag.itemCount}
                  <span className="sr-only">
                    {tag.itemCount === 1 ? " item" : " items"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

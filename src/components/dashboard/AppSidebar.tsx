import Link from "next/link";
import { connection } from "next/server";
import { Folder, Layers, Star, Tag } from "lucide-react";

import { SidebarNavLink } from "@/components/dashboard/SidebarNavLink";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/current-user";
import {
  getFavoriteCollections,
  getRecentNonFavoriteCollections,
} from "@/lib/db/collections";
import {
  getSystemItemTypes,
  getSystemItemTypesWithCounts,
} from "@/lib/db/item-types";
import type { CollectionSummary } from "@/types/collections";
import type { ItemTypeWithCount } from "@/types/items";
import type { CurrentUser } from "@/types/user";

interface SidebarData {
  user: CurrentUser | null;
  itemTypes: ItemTypeWithCount[];
  favoriteCollections: CollectionSummary[];
  recentCollections: CollectionSummary[];
}

async function getSidebarData(): Promise<SidebarData> {
  // 與頁面相同：getCurrentUser() 已讀 cookie，仍明確呼叫以免 layout 被預先渲染
  await connection();

  const user = await getCurrentUser();
  if (!user) {
    // 系統型別不屬於任何使用者，沒有目前使用者時仍列出，數量為 0
    const systemTypes = await getSystemItemTypes();
    return {
      user: null,
      itemTypes: systemTypes.map((type) => ({ ...type, itemCount: 0 })),
      favoriteCollections: [],
      recentCollections: [],
    };
  }

  const [itemTypes, favoriteCollections, recentCollections] =
    await Promise.all([
      getSystemItemTypesWithCounts(user.id),
      getFavoriteCollections(user.id),
      getRecentNonFavoriteCollections(user.id),
    ]);
  return { user, itemTypes, favoriteCollections, recentCollections };
}

/**
 * 型別名稱後方的 PRO 標示。
 * 右側的數量 badge 是 absolute right-1，不占版面寬度，故留出右邊距避免被蓋住
 * （mr-8 是量過的：長名稱把 PRO 推到右側、數量又是 3 位數時，mr-6 會差 2px）；
 * 收合成 icon 模式時一併隱藏，與 SidebarMenuBadge 的行為一致。
 */
function ProBadge() {
  return (
    <Badge
      variant="outline"
      className="mr-8 h-4 px-1 text-[10px] leading-none font-semibold tracking-wide text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden"
    >
      <span aria-hidden>PRO</span>
      <span className="sr-only">Pro plan only</span>
    </Badge>
  );
}

function ItemTypeMenuItem({
  type,
  isPro,
}: {
  type: ItemTypeWithCount;
  isPro: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarNavLink href={`/items/${type.slug}`}>
        {/* Colour comes from the data, so it cannot be a static utility class. */}
        <TypeIcon name={type.icon} style={{ color: type.color }} />
        {/* 名稱明確 truncate：badge 會成為最後一個 span，蓋掉按鈕的 span:last-child 規則 */}
        <span className="truncate">{type.name}</span>
        {/* Pro 使用者已可使用，不再標示 */}
        {type.isProOnly && !isPro && <ProBadge />}
      </SidebarNavLink>
      <SidebarMenuBadge>{type.itemCount}</SidebarMenuBadge>
    </SidebarMenuItem>
  );
}

function FavoriteCollectionMenuItem({
  collection,
}: {
  collection: CollectionSummary;
}) {
  return (
    <SidebarMenuItem>
      <SidebarNavLink href={`/collections/${collection.id}`}>
        <Folder />
        <span>{collection.name}</span>
      </SidebarNavLink>
      <SidebarMenuBadge>
        <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
      </SidebarMenuBadge>
    </SidebarMenuItem>
  );
}

function RecentCollectionMenuItem({
  collection,
}: {
  collection: CollectionSummary;
}) {
  // types 已依數量排序，第一個即主要型別；空的 collection 維持中性色
  const dominantType = collection.types[0];

  return (
    <SidebarMenuItem>
      <SidebarNavLink href={`/collections/${collection.id}`}>
        <Folder />
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-muted-foreground"
          style={{ backgroundColor: dominantType?.color }}
        />
        <span>{collection.name}</span>
      </SidebarNavLink>
      <SidebarMenuBadge>{collection.itemCount}</SidebarMenuBadge>
    </SidebarMenuItem>
  );
}

export async function AppSidebar() {
  const { user, itemTypes, favoriteCollections, recentCollections } =
    await getSidebarData();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              {/* 與首頁導覽列的 Logo 相同樣式；選單按鈕預設把 svg 設為 size-4，以 ! 覆寫 */}
              <Link href="/dashboard" className="gap-2.5">
                <Layers className="size-6! text-home-url" aria-hidden="true" />
                <span className="text-lg font-bold">DevStash</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* top bar 的 Favorites 星星在 sm 以下隱藏，手機上由這裡（drawer）進入 */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarNavLink href="/favorites">
                  <Star />
                  <span>Favorites</span>
                </SidebarNavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarNavLink href="/tags">
                  <Tag />
                  <span>Tags</span>
                </SidebarNavLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {itemTypes.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Types</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {itemTypes.map((type) => (
                  <ItemTypeMenuItem
                    key={type.id}
                    type={type}
                    isPro={user?.isPro ?? false}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user && (
          <>
            <SidebarSeparator />

            {favoriteCollections.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel>Favorites</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {favoriteCollections.map((collection) => (
                      <FavoriteCollectionMenuItem
                        key={collection.id}
                        collection={collection}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup>
              {recentCollections.length > 0 && (
                <SidebarGroupLabel>Recent Collections</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {recentCollections.map((collection) => (
                    <RecentCollectionMenuItem
                      key={collection.id}
                      collection={collection}
                    />
                  ))}
                  <SidebarMenuItem>
                    <SidebarNavLink
                      href="/collections"
                      exact
                      className="text-sidebar-foreground/70"
                    >
                      <span>View all collections</span>
                    </SidebarNavLink>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <UserMenu user={user} />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

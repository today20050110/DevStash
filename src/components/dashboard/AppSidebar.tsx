import Link from "next/link";
import { connection } from "next/server";
import { Folder, Layers, Settings, Star } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "@/lib/db/items";
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

function getInitials(user: CurrentUser): string {
  const source = user.name?.trim() || user.email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

function ItemTypeMenuItem({ type }: { type: ItemTypeWithCount }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link href={`/items/${type.slug}`}>
          {/* Colour comes from the data, so it cannot be a static utility class. */}
          <TypeIcon name={type.icon} style={{ color: type.color }} />
          {/* 名稱明確 truncate：badge 會成為最後一個 span，蓋掉按鈕的 span:last-child 規則 */}
          <span className="truncate">{type.name}</span>
          {type.isProOnly && <ProBadge />}
        </Link>
      </SidebarMenuButton>
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
      <SidebarMenuButton asChild>
        <Link href={`/collections/${collection.slug}`}>
          <Folder />
          <span>{collection.name}</span>
        </Link>
      </SidebarMenuButton>
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
      <SidebarMenuButton asChild>
        <Link href={`/collections/${collection.slug}`}>
          <Folder />
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-muted-foreground"
            style={{ backgroundColor: dominantType?.color }}
          />
          <span>{collection.name}</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuBadge>{collection.itemCount}</SidebarMenuBadge>
    </SidebarMenuItem>
  );
}

function UserMenu({ user }: { user: CurrentUser }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg">
          <Avatar className="size-8 rounded-full">
            <AvatarFallback className="rounded-full">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-medium">
              {user.name ?? user.email}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              {user.email}
            </span>
          </div>
          <Settings className="ml-auto size-4 text-sidebar-foreground/70" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
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
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Layers className="size-4" />
                </div>
                <span className="text-base font-semibold">DevStash</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {itemTypes.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Types</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {itemTypes.map((type) => (
                  <ItemTypeMenuItem key={type.id} type={type} />
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
                    <SidebarMenuButton
                      asChild
                      className="text-sidebar-foreground/70"
                    >
                      <Link href="/collections">
                        <span>View all collections</span>
                      </Link>
                    </SidebarMenuButton>
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

import Link from "next/link";
import { Folder, Layers, Settings, Star } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getIcon } from "@/lib/icons";
import { collections, currentUser, itemTypes } from "@/lib/mock-data";

const favoriteCollections = collections.filter((c) => c.isFavorite);

// Favourites already have their own section, so keep them out of this one.
const recentCollections = collections
  .filter((c) => !c.isFavorite)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const userInitials = currentUser.name
  .split(" ")
  .map((part) => part[0])
  .join("");

export function AppSidebar() {
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
        <SidebarGroup>
          <SidebarGroupLabel>Types</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itemTypes.map((type) => {
                const Icon = getIcon(type.icon);
                return (
                  <SidebarMenuItem key={type.id}>
                    <SidebarMenuButton asChild>
                      <Link href={`/items/${type.slug}`}>
                        {/* Colour comes from the data, so it cannot be a static utility class. */}
                        <Icon style={{ color: type.color }} />
                        <span>{type.name}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{type.itemCount}</SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Favorites</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {favoriteCollections.map((collection) => (
                <SidebarMenuItem key={collection.id}>
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent Collections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentCollections.map((collection) => (
                <SidebarMenuItem key={collection.id}>
                  <SidebarMenuButton asChild>
                    <Link href={`/collections/${collection.slug}`}>
                      <Folder />
                      <span>{collection.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{collection.itemCount}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8 rounded-full">
                <AvatarFallback className="rounded-full">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">
                  {currentUser.name}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {currentUser.email}
                </span>
              </div>
              <Settings className="ml-auto size-4 text-sidebar-foreground/70" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

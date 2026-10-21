"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { defaultFilter } from "cmdk";
import { Folder } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type {
  SearchCollection,
  SearchData,
  SearchItem,
} from "@/types/search";

interface CommandPaletteContextValue {
  openPalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

/**
 * cmdk 預設會比對 value；這裡的 value 是 id（確保唯一），不該被搜尋，
 * 所以只比對 keywords（標題、型別、預覽或名稱），仍沿用 cmdk 的模糊評分
 */
function filterByKeywords(_value: string, search: string, keywords?: string[]) {
  return defaultFilter("", search, keywords);
}

/**
 * 全域 command palette：Cmd+K／Ctrl+K 開關，資料由 layout 預先載入，搜尋在用戶端進行。
 * 要放在 ItemDrawerProvider 裡面，選 item 時才能開啟 drawer
 */
export function CommandPaletteProvider({
  data,
  children,
}: {
  data: SearchData;
  children: ReactNode;
}) {
  const router = useRouter();
  const { openItem } = useItemDrawer();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // 瀏覽器自動填入（autofill）與部分擴充功能送出的 keydown 沒有 key，不能直接呼叫字串方法
      if (event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        // 瀏覽器的 Ctrl+K 會跳到網址列搜尋
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function selectItem(id: string) {
    setOpen(false);
    openItem(id);
  }

  function selectCollection(id: string) {
    setOpen(false);
    router.push(`/collections/${id}`);
  }

  return (
    <CommandPaletteContext value={{ openPalette: () => setOpen(true) }}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search your items and collections"
      >
        {/* CommandDialog 不含 Command 本身；filter 放在這裡 */}
        <SearchCommand
          data={data}
          onSelectItem={selectItem}
          onSelectCollection={selectCollection}
        />
      </CommandDialog>
    </CommandPaletteContext>
  );
}

interface SearchCommandProps {
  data: SearchData;
  onSelectItem: (id: string) => void;
  onSelectCollection: (id: string) => void;
}

function itemKeywords(item: SearchItem): string[] {
  return [item.title, item.type.name, item.preview ?? ""];
}

function collectionKeywords(collection: SearchCollection): string[] {
  return [collection.name];
}

/** 該組最相符的一筆的分數；沒有輸入時為 0 */
function bestScore(keywordLists: string[][], search: string): number {
  if (search === "") {
    return 0;
  }
  return Math.max(
    0,
    ...keywordLists.map((keywords) => filterByKeywords("", search, keywords)),
  );
}

/**
 * cmdk 只排序組內的項目，不會依分數重排群組（試過明確指定群組的 value 也一樣），
 * 所以搜尋字串由這裡控制，自己比較兩組的最高分：例如搜尋「devops」時，
 * 完全相符的 collection 會排在只有模糊相符的 items 前面。沒有輸入時 Items 在前
 */
function SearchCommand({
  data,
  onSelectItem,
  onSelectCollection,
}: SearchCommandProps) {
  // dialog 關閉時整個卸載，下次開啟從空白開始
  const [search, setSearch] = useState("");
  const collectionsFirst =
    bestScore(data.collections.map(collectionKeywords), search) >
    bestScore(data.items.map(itemKeywords), search);

  const itemsGroup = data.items.length > 0 && (
    <CommandGroup heading="Items">
      {data.items.map((item) => (
        <CommandItem
          key={item.id}
          value={`item:${item.id}`}
          keywords={itemKeywords(item)}
          onSelect={() => onSelectItem(item.id)}
        >
          {/* 型別色由資料決定，無法寫成固定的 Tailwind class */}
          <TypeIcon
            name={item.type.icon}
            style={{ color: item.type.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate">{item.title}</p>
            {item.preview && (
              <p className="truncate text-xs text-muted-foreground">
                {item.preview}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {item.type.name}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );

  const collectionsGroup = data.collections.length > 0 && (
    <CommandGroup heading="Collections">
      {data.collections.map((collection) => (
        <CommandItem
          key={collection.id}
          value={`collection:${collection.id}`}
          keywords={collectionKeywords(collection)}
          onSelect={() => onSelectCollection(collection.id)}
        >
          <Folder aria-hidden />
          <span className="min-w-0 flex-1 truncate">{collection.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {collection.itemCount}{" "}
            {collection.itemCount === 1 ? "item" : "items"}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );

  return (
    <Command filter={filterByKeywords}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Search items and collections..."
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {collectionsFirst ? collectionsGroup : itemsGroup}
        {collectionsFirst ? itemsGroup : collectionsGroup}
      </CommandList>
    </Command>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      "useCommandPalette must be used within CommandPaletteProvider",
    );
  }
  return context;
}

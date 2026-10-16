import { describe, expect, it } from "vitest";

import {
  sortFavoriteCollections,
  sortFavoriteItems,
} from "@/lib/favorites-sort";
import type { FavoriteCollection, FavoriteItem } from "@/types/favorites";

const SNIPPETS = { name: "Snippets", icon: "Code", color: "#3b82f6" };
const LINKS = { name: "Links", icon: "Link", color: "#10b981" };
const PROMPTS = { name: "Prompts", icon: "Sparkles", color: "#8b5cf6" };

function item(
  title: string,
  day: number,
  type: FavoriteItem["type"],
): FavoriteItem {
  return {
    id: title,
    title,
    updatedAt: new Date(Date.UTC(2026, 9, day)),
    type,
  };
}

function collection(
  name: string,
  day: number,
  type: FavoriteCollection["type"],
): FavoriteCollection {
  return {
    id: name,
    name,
    updatedAt: new Date(Date.UTC(2026, 9, day)),
    itemCount: type ? 1 : 0,
    type,
  };
}

const titles = (items: FavoriteItem[]) => items.map((entry) => entry.title);
const names = (collections: FavoriteCollection[]) =>
  collections.map((entry) => entry.name);

describe("sortFavoriteItems", () => {
  const ITEMS = [
    item("item 10", 3, SNIPPETS),
    item("Banana", 1, LINKS),
    item("apple", 5, SNIPPETS),
    item("item 2", 2, PROMPTS),
  ];

  it("date：updatedAt 由新到舊", () => {
    expect(titles(sortFavoriteItems(ITEMS, "date"))).toEqual([
      "apple",
      "item 10",
      "item 2",
      "Banana",
    ]);
  });

  it("name：不分大小寫，數字依數值比較", () => {
    expect(titles(sortFavoriteItems(ITEMS, "name"))).toEqual([
      "apple",
      "Banana",
      "item 2",
      "item 10",
    ]);
  });

  it("type：依型別名稱，同型別再依名稱", () => {
    expect(titles(sortFavoriteItems(ITEMS, "type"))).toEqual([
      "Banana",
      "item 2",
      "apple",
      "item 10",
    ]);
  });

  it("不改動傳入的陣列", () => {
    const original = [...ITEMS];
    sortFavoriteItems(ITEMS, "name");
    expect(ITEMS).toEqual(original);
  });

  it("同值時保留傳入的順序（穩定排序）", () => {
    const same = [item("b", 1, LINKS), item("a", 1, LINKS)];
    expect(titles(sortFavoriteItems(same, "date"))).toEqual(["b", "a"]);
  });
});

describe("sortFavoriteCollections", () => {
  const COLLECTIONS = [
    collection("Empty", 4, null),
    collection("React", 1, SNIPPETS),
    collection("AI", 2, PROMPTS),
    collection("Bookmarks", 3, LINKS),
  ];

  it("type：依主要型別名稱，沒有型別的排最後", () => {
    expect(names(sortFavoriteCollections(COLLECTIONS, "type"))).toEqual([
      "Bookmarks",
      "AI",
      "React",
      "Empty",
    ]);
  });

  it("name 與 date 和 items 相同規則", () => {
    expect(names(sortFavoriteCollections(COLLECTIONS, "name"))).toEqual([
      "AI",
      "Bookmarks",
      "Empty",
      "React",
    ]);
    expect(names(sortFavoriteCollections(COLLECTIONS, "date"))).toEqual([
      "Empty",
      "Bookmarks",
      "AI",
      "React",
    ]);
  });
});

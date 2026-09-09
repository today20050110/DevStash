import { itemTypes, type ItemType } from "./mock-data";

const BY_ID = new Map(itemTypes.map((type) => [type.id, type]));

export function getItemType(id: string): ItemType | undefined {
  return BY_ID.get(id);
}

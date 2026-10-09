import { TypeIcon } from "@/components/dashboard/TypeIcon";

interface TypeIconTileProps {
  /** The lucide icon name stored on `ItemType.icon`. */
  icon: string;
  /** `ItemType.color` */
  color: string;
}

/** 卡片、型別列表頁首與 drawer 共用的型別圖示方塊：淡色底 + 型別色圖示 */
export function TypeIconTile({ icon, color }: TypeIconTileProps) {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
      // 色碼來自資料庫，只能以 inline style 套用。color-mix rather than appending
      // alpha to the hex — ItemType.color is an unconstrained String, so the
      // six-digit form is not guaranteed.
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        color,
      }}
    >
      <TypeIcon name={icon} className="size-5" />
    </div>
  );
}

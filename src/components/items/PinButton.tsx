"use client";

import { Pin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useItemPinToggle } from "@/hooks/use-item-pin-toggle";
import { cn } from "@/lib/utils";

interface PinButtonProps {
  itemId: string;
  isPinned: boolean;
  onSaved?: (pinnedAt: Date | null) => void;
}

/** drawer 操作列的釘選按鈕；卡片上的 Pin 圖示只是狀態標示，不用這個元件 */
export function PinButton({
  itemId,
  isPinned: initial,
  onSaved,
}: PinButtonProps) {
  const { isPinned, isPending, toggle } = useItemPinToggle({
    itemId,
    isPinned: initial,
    onSaved,
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isPinned}
    >
      <Pin className={cn(isPinned && "fill-current")} />
      {isPinned ? "Pinned" : "Pin"}
    </Button>
  );
}

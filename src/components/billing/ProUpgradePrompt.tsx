import Link from "next/link";
import { Check, Lock } from "lucide-react";

import { UpgradeButtons } from "@/components/billing/UpgradeButtons";
import { TypeIconTile } from "@/components/dashboard/TypeIconTile";
import { Card, CardContent } from "@/components/ui/card";

interface ProUpgradePromptProps {
  /** 型別名稱，例如 Files、Images */
  typeName: string;
  icon: string;
  color: string;
}

const PRO_BENEFITS = [
  "Upload files and images",
  "Unlimited items and collections",
  "Cancel anytime from billing settings",
];

/** Free 使用者造訪 Pro 限定的型別頁時，取代 item 列表的升級頁 */
export function ProUpgradePrompt({ typeName, icon, color }: ProUpgradePromptProps) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-6 py-6 text-center">
        <div className="relative">
          <TypeIconTile icon={icon} color={color} />
          <span className="absolute -right-2 -bottom-2 flex size-6 items-center justify-center rounded-full border bg-background">
            <Lock className="size-3.5 text-muted-foreground" aria-hidden />
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{typeName} are a Pro feature</h2>
          <p className="text-sm text-muted-foreground">
            Upgrade to DevStash Pro to store and organize your {typeName.toLowerCase()}{" "}
            alongside your snippets, prompts and notes.
          </p>
        </div>
        <ul className="space-y-1.5 text-left text-sm">
          {PRO_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2">
              <Check className="size-4 text-emerald-500" aria-hidden />
              {benefit}
            </li>
          ))}
        </ul>
        <UpgradeButtons className="justify-center" />
        <Link
          href="/settings#billing"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View billing settings
        </Link>
      </CardContent>
    </Card>
  );
}

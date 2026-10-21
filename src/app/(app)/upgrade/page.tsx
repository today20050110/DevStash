import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SIGN_IN_PATH } from "@/auth.config";
import { UpgradePlans } from "@/components/billing/UpgradePlans";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Upgrade — DevStash",
};

export default async function UpgradePage() {
  // 與其他頁面相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const user = await getCurrentUser();
  if (!user) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/upgrade`);
  }
  // 已是 Pro 的人改方案走 Settings 的 Customer Portal
  if (user.isPro) {
    redirect("/settings#billing");
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Upgrade to DevStash Pro</h1>
        <p className="text-muted-foreground">
          Unlimited items and collections, file and image uploads, and more.
        </p>
      </div>
      <UpgradePlans />
    </div>
  );
}

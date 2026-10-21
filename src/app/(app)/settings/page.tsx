import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SIGN_IN_PATH } from "@/auth.config";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { EditorPreferencesForm } from "@/components/settings/EditorPreferencesForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { syncCheckoutSession } from "@/lib/billing-checkout";
import { getCurrentUser } from "@/lib/current-user";
import { countRecentAiUsage } from "@/lib/db/ai-usage";
import { getUserProfile } from "@/lib/db/users";
import { getUserUsage } from "@/lib/usage";
import { NARROW_PAGE_CLASS } from "@/lib/page-width";
import { firstParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings — DevStash",
};

/**
 * 從 Checkout 回來時先向 Stripe 同步，回傳同步後的 isPro；沒有 session id 或同步失敗時回傳 null。
 * 失敗不影響頁面：webhook 之後仍會更新
 */
async function syncReturnedCheckout(
  userId: string,
  sessionId: string | undefined,
): Promise<boolean | null> {
  if (!sessionId) {
    return null;
  }
  try {
    const state = await syncCheckoutSession(userId, sessionId);
    return state?.isPro ?? null;
  } catch (error) {
    console.error("Failed to sync checkout session", error);
    return null;
  }
}

async function getSettingsData(checkoutSessionId: string | undefined) {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const user = await getCurrentUser();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!user) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/settings`);
  }

  // getCurrentUser() 是同步前讀的，剛同步完要以同步結果為準
  const isPro =
    (await syncReturnedCheckout(user.id, checkoutSessionId)) ?? user.isPro;
  // AI 只開放給 Pro，Free 不必查 AI 用量
  const [profile, usage, aiRequestCount] = await Promise.all([
    getUserProfile(user.id),
    getUserUsage(user.id, isPro),
    isPro ? countRecentAiUsage(user.id) : 0,
  ]);
  if (!profile) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/settings`);
  }
  return { profile, usage, isPro, aiRequestCount };
}

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const { passwordChanged, upgraded, session_id: sessionId } = await searchParams;
  const isUpgradeReturn = firstParam(upgraded) === "true";
  const { profile, usage, isPro, aiRequestCount } = await getSettingsData(
    isUpgradeReturn ? firstParam(sessionId) : undefined,
  );

  return (
    <div className={cn(NARROW_PAGE_CLASS, "space-y-10")}>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Editor preferences, billing and account
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Editor</h2>
        <Card>
          <CardHeader>
            <CardTitle>Editor preferences</CardTitle>
            <CardDescription>
              Applies to the code editor for snippets and commands. Changes are
              saved automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditorPreferencesForm />
          </CardContent>
        </Card>
      </section>

      <BillingSettings
        isPro={isPro}
        itemCount={usage.itemCount}
        collectionCount={usage.collectionCount}
        aiRequestCount={aiRequestCount}
        upgraded={isUpgradeReturn}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Account</h2>
        {profile.hasPassword && (
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                Enter your current password, then choose a new one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm
                email={profile.email}
                passwordChanged={firstParam(passwordChanged) === "1"}
              />
            </CardContent>
          </Card>
        )}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
            <CardDescription>
              Permanently delete your account and everything you have stashed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog email={profile.email} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

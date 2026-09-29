import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SIGN_IN_PATH } from "@/auth.config";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { ProfileInfo } from "@/components/profile/ProfileInfo";
import { ProfileStats } from "@/components/profile/ProfileStats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUserId } from "@/lib/current-user";
import { getCollectionCounts } from "@/lib/db/collections";
import { getItemCounts, getSystemItemTypesWithCounts } from "@/lib/db/items";
import { getUserProfile } from "@/lib/db/users";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Profile — DevStash",
};

async function getProfileData() {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/profile`);
  }

  const [profile, itemCounts, collectionCounts, itemTypes] = await Promise.all(
    [
      getUserProfile(userId),
      getItemCounts(userId),
      getCollectionCounts(userId),
      getSystemItemTypesWithCounts(userId),
    ],
  );
  if (!profile) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/profile`);
  }
  return { profile, itemCounts, collectionCounts, itemTypes };
}

export default async function ProfilePage({
  searchParams,
}: PageProps<"/profile">) {
  const { passwordChanged } = await searchParams;
  const { profile, itemCounts, collectionCounts, itemTypes } =
    await getProfileData();

  return (
    <div className="max-w-4xl space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Your account and usage</p>
      </div>

      <ProfileInfo profile={profile} />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Usage</h2>
        <ProfileStats
          items={itemCounts.items}
          collections={collectionCounts.collections}
          itemTypes={itemTypes}
        />
      </section>

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

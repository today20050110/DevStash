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
import { getCurrentUserId } from "@/lib/current-user";
import { getUserProfile } from "@/lib/db/users";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Settings — DevStash",
};

async function getSettingsData() {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/settings`);
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/settings`);
  }
  return profile;
}

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const { passwordChanged } = await searchParams;
  const profile = await getSettingsData();

  return (
    <div className="max-w-4xl space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Editor preferences and account</p>
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

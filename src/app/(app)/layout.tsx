import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { ItemDrawerProvider } from "@/components/items/ItemDrawerProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/current-user";
import { getCreatableItemTypes } from "@/lib/db/item-types";
import { canUploadFiles } from "@/lib/plan";

// 登入後的頁面（/dashboard、/profile）共用側邊欄與頂部列；route group 不影響網址
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // proxy 只驗 JWT 簽章；帳號已刪除、或密碼重設後舊 token 版本不符時在這裡導回登入頁，
  // 而不是顯示空白的頁面。getCurrentUser() 以 cache() 包起來，頁面再呼叫不會多查一次
  const user = await getCurrentUser();
  if (!user) {
    redirect(SIGN_IN_PATH);
  }
  const itemTypes = await getCreatableItemTypes(canUploadFiles(user.isPro));

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar itemTypes={itemTypes} />
        <main className="flex-1 overflow-y-auto p-8">
          <ItemDrawerProvider>{children}</ItemDrawerProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

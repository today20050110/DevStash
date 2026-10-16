import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { ItemDrawerProvider } from "@/components/items/ItemDrawerProvider";
import { CommandPaletteProvider } from "@/components/search/CommandPalette";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/current-user";
import { getCreatableItemTypes } from "@/lib/db/item-types";
import { getSearchData } from "@/lib/db/search";
import { canUploadFiles } from "@/lib/plan";

// 登入後的頁面（/dashboard、/profile、/settings）共用側邊欄與頂部列；route group 不影響網址
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // proxy 只驗 JWT 簽章；帳號已刪除、或密碼重設後舊 token 版本不符時在這裡導回登入頁，
  // 而不是顯示空白的頁面。getCurrentUser() 以 cache() 包起來，頁面再呼叫不會多查一次
  const user = await getCurrentUser();
  if (!user) {
    redirect(SIGN_IN_PATH);
  }
  // command palette 的資料與新增／編輯 item 表單的 collection 選項；
  // 新增、編輯、刪除後的 router.refresh() 會重新取得
  const [itemTypes, searchData] = await Promise.all([
    getCreatableItemTypes(canUploadFiles(user.isPro)),
    getSearchData(user.id),
  ]);
  // 搜尋資料的 collections 已依名稱排序，表單選項只取 id 與名稱，不另查一次
  const collections = searchData.collections.map(({ id, name }) => ({
    id,
    name,
  }));

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* drawer 包住 top bar：palette 在 top bar 開啟，選 item 時要能開啟 drawer */}
        <ItemDrawerProvider collections={collections}>
          <CommandPaletteProvider data={searchData}>
            <Topbar itemTypes={itemTypes} collections={collections} />
            <main className="flex-1 overflow-y-auto p-8">{children}</main>
          </CommandPaletteProvider>
        </ItemDrawerProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

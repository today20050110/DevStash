import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// 登入後的頁面（/dashboard、/profile）共用側邊欄與頂部列；route group 不影響網址
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

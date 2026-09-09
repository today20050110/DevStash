import { Topbar } from "@/components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <div className="flex h-svh">
      {/* Placeholder — the real sidebar lands in phase 2. */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar p-4 md:block">
        <h2 className="text-lg font-semibold">Sidebar</h2>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}

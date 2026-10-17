import { HomeNav } from "@/components/homepage/HomeNav";
import {
  getHomeLinks,
  NAV_SECTION_LINKS_FROM_OTHER_PAGES,
} from "@/components/homepage/homepage-content";

// auth 頁只給未登入的人用（sign-in、register 已登入會被導向 dashboard），導覽列用未登入的連結
const { navActions } = getHomeLinks(false);

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <HomeNav
        actions={navActions}
        sectionLinks={NAV_SECTION_LINKS_FROM_OTHER_PAGES}
      />
      {/* pt-22：導覽列固定在頂部（h-16），再留 24px，表單置中時不會被它蓋住 */}
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 pt-22 pb-6">
        <main className="w-full max-w-sm">{children}</main>
      </div>
    </>
  );
}

import { redirect } from "next/navigation";

// 還沒有 landing page，首頁先直接導向 dashboard
export default function Home() {
  redirect("/dashboard");
}

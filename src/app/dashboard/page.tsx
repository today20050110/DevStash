import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — DevStash",
};

export default function DashboardPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Your developer knowledge hub</p>

      {/* Placeholder — stats, collections and pinned/recent items land in phase 3. */}
      <h2 className="pt-8 text-lg font-semibold">Main</h2>
    </div>
  );
}

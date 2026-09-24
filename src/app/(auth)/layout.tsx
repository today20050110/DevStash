import Link from "next/link";
import { Layers } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-semibold text-foreground"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Layers className="size-4" />
        </span>
        DevStash
      </Link>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}

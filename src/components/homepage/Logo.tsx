import Link from "next/link";
import { Layers } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-bold">
      <Layers className="size-6 text-home-url" aria-hidden="true" />
      <span>DevStash</span>
    </Link>
  );
}

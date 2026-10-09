"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * 最後防線。放在根目錄而不是 (app)：error.tsx 不包住同一層的 layout，
 * 而 New Item dialog 與 item drawer 都掛在 (app)/layout.tsx 底下。
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Try again, and if it keeps happening,
        reload the page.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}

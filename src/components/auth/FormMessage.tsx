import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormMessageProps {
  variant: "error" | "success";
  children: ReactNode;
}

// 表單上方的整體訊息；錯誤用 role="alert" 讓螢幕閱讀器立即讀出
export function FormMessage({ variant, children }: FormMessageProps) {
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        variant === "error"
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
      )}
    >
      {children}
    </p>
  );
}

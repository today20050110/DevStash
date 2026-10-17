import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "DevStash",
  description: "A developer knowledge hub for snippets, commands, prompts and notes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // `dark` is hardcoded for now — dark mode is the default and there is no toggle yet.
  return (
    // data-scroll-behavior：首頁在 <html> 開了平滑捲動，換頁時讓 Next.js 暫時關掉，避免跳轉時出現捲動動畫
    <html
      lang="en"
      className={cn("dark font-sans", geist.variable)}
      data-scroll-behavior="smooth"
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

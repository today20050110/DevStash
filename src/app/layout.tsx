import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "DevStash",
  description: "A developer knowledge hub for snippets, commands, prompts and notes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // `dark` is hardcoded for now — dark mode is the default and there is no toggle yet.
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}

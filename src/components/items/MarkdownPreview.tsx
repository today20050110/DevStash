"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { isHttpUrl } from "@/lib/url";

/**
 * 不渲染原始 HTML（未加 rehype-raw）；連結與圖片只接受 http(s)，
 * 相對路徑與其他 scheme 以純文字顯示，避免對本站發出請求或執行程式碼。
 */
const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, children }) =>
    href && isHttpUrl(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: ({ src, alt }) =>
    typeof src === "string" && isHttpUrl(src) ? (
      // 使用者內容中的任意外部圖片，無法事先設定 next/image 的 remotePatterns
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    ) : (
      <span>{alt}</span>
    ),
};

/**
 * 獨立成模組，由 MarkdownEditor 以 next/dynamic 載入：react-markdown 與 remark-gfm
 * 約 55 KB（gzip），只在真的要顯示預覽時才下載，不跟著每個頁面的 layout 載入
 */
export default function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

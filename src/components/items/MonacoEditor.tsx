"use client";

// 先設定本機打包的 monaco，再匯出 Editor。monaco-editor 載入時就會存取 window，
// 只能在瀏覽器執行，由 CodeEditor 以 next/dynamic（ssr: false）載入這個模組；
// 也因此 monaco 的程式碼只在第一次顯示程式碼編輯器時才下載
import "@/components/items/monaco-setup";

export { default } from "@monaco-editor/react";

"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { updateEditorPreferences } from "@/actions/editor-preferences";
import { GENERIC_ERROR_MESSAGE } from "@/lib/action-errors";
import type { EditorPreferences } from "@/lib/editor-preferences";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  updatePreference: <K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K],
  ) => Promise<void>;
}

const EditorPreferencesContext =
  createContext<EditorPreferencesContextValue | null>(null);

/**
 * 編輯器偏好的單一來源：設定頁改動後，之後開啟的 CodeEditor 立即套用，不必重新整理。
 * 初始值由 layout 從資料庫讀出；變更時先樂觀更新再自動儲存，失敗則還原為最後一次存檔成功的值。
 */
export function EditorPreferencesProvider({
  initialPreferences,
  children,
}: {
  initialPreferences: EditorPreferences;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  // 連續快速變更時，下一次要以上一次的結果為基礎，不能等重新渲染後的 state
  const latestRef = useRef(initialPreferences);
  const savedRef = useRef(initialPreferences);

  async function updatePreference<K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K],
  ) {
    const next = { ...latestRef.current, [key]: value };
    latestRef.current = next;
    setPreferences(next);

    let error: string = GENERIC_ERROR_MESSAGE;
    try {
      const result = await updateEditorPreferences(next);
      if (result.success && result.data) {
        savedRef.current = result.data;
        toast.success("Editor preferences saved");
        return;
      }
      error = result.error ?? error;
    } catch (cause) {
      console.error("Failed to save editor preferences", cause);
    }
    latestRef.current = savedRef.current;
    setPreferences(savedRef.current);
    toast.error(error);
  }

  return (
    <EditorPreferencesContext value={{ preferences, updatePreference }}>
      {children}
    </EditorPreferencesContext>
  );
}

export function useEditorPreferences(): EditorPreferencesContextValue {
  const context = useContext(EditorPreferencesContext);
  if (!context) {
    throw new Error(
      "useEditorPreferences must be used within EditorPreferencesProvider",
    );
  }
  return context;
}

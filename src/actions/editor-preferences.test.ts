import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateEditorPreferences } from "@/actions/editor-preferences";
import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
} from "@/lib/action-errors";
import { getCurrentUserId } from "@/lib/current-user";
import { updateEditorPreferences as updateEditorPreferencesInDb } from "@/lib/db/users";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/users", () => ({ updateEditorPreferences: vi.fn() }));

const PREFERENCES = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "github-dark",
} as const;

describe("updateEditorPreferences action", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(updateEditorPreferencesInDb).mockResolvedValue();
  });

  it("以 session 的 userId 寫入並回傳儲存的偏好", async () => {
    const result = await updateEditorPreferences(PREFERENCES);

    expect(result).toEqual({ success: true, data: PREFERENCES });
    expect(updateEditorPreferencesInDb).toHaveBeenCalledWith(
      "user-1",
      PREFERENCES,
    );
  });

  it("多餘的欄位（包括 userId）不會寫進資料庫", async () => {
    await updateEditorPreferences({ ...PREFERENCES, userId: "user-2", x: 1 });

    expect(updateEditorPreferencesInDb).toHaveBeenCalledWith(
      "user-1",
      PREFERENCES,
    );
  });

  it.each([
    ["不在選項內的字級", { ...PREFERENCES, fontSize: 99 }],
    ["不支援的主題", { ...PREFERENCES, theme: "light" }],
    ["缺少欄位", { fontSize: 14 }],
    ["不是物件", "vs-dark"],
  ])("%s：回傳錯誤，不查 session 也不寫入", async (_, data) => {
    const result = await updateEditorPreferences(data);

    expect(result).toEqual({
      success: false,
      error: "Invalid editor preferences",
    });
    expect(getCurrentUserId).not.toHaveBeenCalled();
    expect(updateEditorPreferencesInDb).not.toHaveBeenCalled();
  });

  it("未登入時不寫入", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await updateEditorPreferences(PREFERENCES);

    expect(result).toEqual({ success: false, error: NOT_SIGNED_IN_MESSAGE });
    expect(updateEditorPreferencesInDb).not.toHaveBeenCalled();
  });

  it("資料庫錯誤時回傳通用訊息", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(updateEditorPreferencesInDb).mockRejectedValue(new Error("db"));

    const result = await updateEditorPreferences(PREFERENCES);

    expect(result).toEqual({ success: false, error: GENERIC_ERROR_MESSAGE });
  });
});

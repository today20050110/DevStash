import { beforeEach, describe, expect, it, vi } from "vitest";

import { findCreatableItemType } from "@/lib/db/item-types";
import { countActiveItems, isStorageKeyInUse } from "@/lib/db/items";
import { getUserIsPro } from "@/lib/db/users";
import { createUploadUrl, deleteObject, headObject } from "@/lib/r2";
import { prepareUpload, verifyUploadedFile } from "@/lib/uploads";
import type { CreatableItemType } from "@/types/items";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/db/item-types", () => ({ findCreatableItemType: vi.fn() }));
vi.mock("@/lib/db/items", () => ({
  countActiveItems: vi.fn(),
  isStorageKeyInUse: vi.fn(),
}));
vi.mock("@/lib/db/users", () => ({ getUserIsPro: vi.fn() }));
vi.mock("@/lib/r2", () => ({
  createUploadUrl: vi.fn(),
  deleteObject: vi.fn(),
  headObject: vi.fn(),
}));

const IMAGES = {
  id: "type-images",
  name: "Images",
  slug: "images",
  icon: "Image",
  color: "#ec4899",
  kind: "FILE",
} satisfies CreatableItemType;

const KEY = "users/user-1/items/0b6f0c0e-8a1d-4c8e-9a52-2d7e1f0c9b11.png";

describe("prepareUpload", () => {
  const input = { itemTypeId: "type-images", fileName: "a.PNG", size: 1024 };

  beforeEach(() => {
    vi.mocked(findCreatableItemType).mockResolvedValue(IMAGES);
    vi.mocked(getUserIsPro).mockResolvedValue(false);
    vi.mocked(countActiveItems).mockResolvedValue(10);
    vi.mocked(createUploadUrl).mockResolvedValue("https://r2.example/signed");
  });

  it("產生該使用者的 key，並以白名單的 MIME 與實際大小簽發網址", async () => {
    const result = await prepareUpload("user-1", input);

    expect(result).toMatchObject({
      ok: true,
      uploadUrl: "https://r2.example/signed",
      mimeType: "image/png",
    });
    const [key, mimeType, size] = vi.mocked(createUploadUrl).mock.calls[0];
    expect(key).toMatch(/^users\/user-1\/items\/[0-9a-f-]{36}\.png$/);
    expect(mimeType).toBe("image/png");
    expect(size).toBe(1024);
  });

  it.each([
    ["查不到（別人的自訂型別）", null],
    ["不是 FILE kind", { ...IMAGES, kind: "TEXT" as const, slug: "notes" }],
  ])("型別%s時拒絕", async (_label, itemType) => {
    vi.mocked(findCreatableItemType).mockResolvedValue(itemType);

    await expect(prepareUpload("user-1", input)).resolves.toMatchObject({
      ok: false,
      reason: "invalid-type",
    });
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("Free 方案達到項目上限時，上傳前就拒絕", async () => {
    vi.mocked(countActiveItems).mockResolvedValue(50);

    await expect(prepareUpload("user-1", input)).resolves.toMatchObject({
      ok: false,
      reason: "limit-reached",
    });
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("Pro 方案不檢查項目數", async () => {
    vi.mocked(getUserIsPro).mockResolvedValue(true);
    vi.mocked(countActiveItems).mockResolvedValue(500);

    await expect(prepareUpload("user-1", input)).resolves.toMatchObject({
      ok: true,
    });
  });

  it("副檔名或大小不符時不簽發網址", async () => {
    await expect(
      prepareUpload("user-1", { ...input, fileName: "a.pdf" }),
    ).resolves.toMatchObject({ ok: false, reason: "invalid-file" });
    await expect(
      prepareUpload("user-1", { ...input, size: 6 * 1024 * 1024 }),
    ).resolves.toMatchObject({ ok: false, reason: "invalid-file" });
    expect(createUploadUrl).not.toHaveBeenCalled();
  });
});

describe("verifyUploadedFile", () => {
  beforeEach(() => {
    vi.mocked(isStorageKeyInUse).mockResolvedValue(false);
    vi.mocked(headObject).mockResolvedValue({
      size: 2048,
      contentType: "image/png",
    });
    vi.mocked(deleteObject).mockResolvedValue();
  });

  it("以 R2 上的實際大小與白名單的 MIME 回傳檔案資訊", async () => {
    await expect(
      verifyUploadedFile("user-1", "image", KEY, "diagram.png"),
    ).resolves.toEqual({
      ok: true,
      file: {
        storageKey: KEY,
        fileName: "diagram.png",
        fileSize: 2048,
        mimeType: "image/png",
      },
    });
  });

  it("沒有上傳時要求先上傳", async () => {
    await expect(
      verifyUploadedFile("user-1", "image", null, null),
    ).resolves.toEqual({ ok: false, error: "Upload a file first" });
  });

  it("別人的 key 不查 R2 就拒絕", async () => {
    const result = await verifyUploadedFile(
      "user-2",
      "image",
      KEY,
      "diagram.png",
    );

    expect(result.ok).toBe(false);
    expect(headObject).not.toHaveBeenCalled();
  });

  it("已被其他 item 使用的 key 不能再建立一次", async () => {
    vi.mocked(isStorageKeyInUse).mockResolvedValue(true);

    const result = await verifyUploadedFile("user-1", "image", KEY, "a.png");

    expect(result.ok).toBe(false);
    expect(isStorageKeyInUse).toHaveBeenCalledWith("user-1", KEY);
    expect(headObject).not.toHaveBeenCalled();
  });

  it("R2 上沒有物件（沒傳完或已過期）時拒絕", async () => {
    vi.mocked(headObject).mockResolvedValue(null);

    await expect(
      verifyUploadedFile("user-1", "image", KEY, "a.png"),
    ).resolves.toMatchObject({ ok: false });
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("實際大小超過上限時拒絕並刪除 R2 物件", async () => {
    vi.mocked(headObject).mockResolvedValue({
      size: 5 * 1024 * 1024 + 1,
      contentType: "image/png",
    });

    await expect(
      verifyUploadedFile("user-1", "image", KEY, "a.png"),
    ).resolves.toEqual({ ok: false, error: "File must be 5 MB or smaller" });
    expect(deleteObject).toHaveBeenCalledWith(KEY);
  });

  it("檔名的副檔名與 key 不同時拒絕（不能以 .svg 的名稱套用在 .png 的上傳）", async () => {
    const result = await verifyUploadedFile("user-1", "image", KEY, "a.svg");

    expect(result.ok).toBe(false);
    expect(deleteObject).toHaveBeenCalledWith(KEY);
  });

  it("R2 記錄的 Content-Type 與白名單不同時拒絕", async () => {
    vi.mocked(headObject).mockResolvedValue({
      size: 10,
      contentType: "text/html",
    });

    const result = await verifyUploadedFile("user-1", "image", KEY, "a.png");

    expect(result.ok).toBe(false);
    expect(deleteObject).toHaveBeenCalledWith(KEY);
  });
});

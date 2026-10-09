import { describe, expect, it } from "vitest";

import {
  buildStorageKey,
  contentDisposition,
  getUploadCategory,
  isOwnStorageKey,
  validateUpload,
} from "@/lib/file-types";

const MB = 1024 * 1024;
const UUID = "0b6f0c0e-8a1d-4c8e-9a52-2d7e1f0c9b11";

describe("getUploadCategory", () => {
  it("只有 images 與 files 可以上傳", () => {
    expect(getUploadCategory("images")).toBe("image");
    expect(getUploadCategory("files")).toBe("file");
    expect(getUploadCategory("snippets")).toBeNull();
  });
});

describe("validateUpload", () => {
  it("MIME 由副檔名決定（不分大小寫），不採用瀏覽器回報的類型", () => {
    expect(validateUpload("image", "Photo.JPG", 1000)).toEqual({
      ok: true,
      extension: "jpg",
      mimeType: "image/jpeg",
    });
    expect(validateUpload("file", "config.yml", 10)).toMatchObject({
      mimeType: "application/x-yaml",
    });
    expect(validateUpload("file", "settings.ini", 10)).toMatchObject({
      mimeType: "text/plain",
    });
  });

  it("圖片與檔案的白名單分開", () => {
    expect(validateUpload("image", "spec.pdf", 10).ok).toBe(false);
    expect(validateUpload("file", "photo.png", 10).ok).toBe(false);
  });

  it.each(["script.html", "run.exe", "noextension", ".png", "trailing."])(
    "不在白名單或沒有副檔名（%s）時拒絕",
    (name) => {
      expect(validateUpload("file", name, 10).ok).toBe(false);
    },
  );

  it("只看最後一個副檔名", () => {
    expect(validateUpload("image", "evil.png.html", 10).ok).toBe(false);
    expect(validateUpload("image", "archive.html.png", 10).ok).toBe(true);
  });

  it("圖片上限 5 MB、檔案上限 10 MB（含等於上限）", () => {
    expect(validateUpload("image", "a.png", 5 * MB).ok).toBe(true);
    expect(validateUpload("image", "a.png", 5 * MB + 1)).toEqual({
      ok: false,
      error: "File must be 5 MB or smaller",
    });
    expect(validateUpload("file", "a.pdf", 10 * MB).ok).toBe(true);
    expect(validateUpload("file", "a.pdf", 10 * MB + 1).ok).toBe(false);
  });

  it.each([0, -1, 1.5, Number.NaN])("大小不合法（%s）時拒絕", (size) => {
    expect(validateUpload("file", "a.txt", size).ok).toBe(false);
  });

  it("檔名超過 255 字元時拒絕", () => {
    expect(validateUpload("file", `${"a".repeat(252)}.txt`, 1).ok).toBe(false);
  });
});

describe("storage keys", () => {
  it("key 只包含 userId、伺服器產生的 id 與副檔名", () => {
    expect(buildStorageKey("user-1", UUID, "png")).toBe(
      `users/user-1/items/${UUID}.png`,
    );
  });

  it("只接受為這個使用者產生的 key", () => {
    const key = buildStorageKey("user-1", UUID, "png");

    expect(isOwnStorageKey(key, "user-1")).toBe(true);
    expect(isOwnStorageKey(key, "user-2")).toBe(false);
  });

  it.each([
    `users/user-1/items/../user-2/items/${UUID}.png`,
    `users/user-1/items/not-a-uuid.png`,
    `users/user-1/items/${UUID}`,
    `users/user-1/other/${UUID}.png`,
    `prefix/users/user-1/items/${UUID}.png`,
  ])("格式不符的 key（%s）一律拒絕", (key) => {
    expect(isOwnStorageKey(key, "user-1")).toBe(false);
  });
});

describe("contentDisposition", () => {
  it("一律以 attachment 下載", () => {
    expect(contentDisposition("report.pdf")).toBe(
      `attachment; filename="report.pdf"; filename*=UTF-8''report.pdf`,
    );
  });

  it("非 ASCII 檔名以 filename* 帶完整名稱，filename 換成底線", () => {
    expect(contentDisposition("筆記.md")).toBe(
      `attachment; filename="__.md"; filename*=UTF-8''%E7%AD%86%E8%A8%98.md`,
    );
  });

  it("引號、反斜線與換行不能跳出 header 參數", () => {
    const header = contentDisposition('a"b\\c\r\nX-Evil: 1.txt');

    expect(header).not.toMatch(/[\r\n]/);
    expect(header).toContain(`filename="a_b_c__X-Evil: 1.txt"`);
    expect(header).toContain(
      "filename*=UTF-8''a%22b%5Cc%0D%0AX-Evil%3A%201.txt",
    );
  });
});

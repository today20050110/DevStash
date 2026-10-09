/**
 * 檔案與圖片上傳的白名單與大小上限（context/features/file-image-spec.md）。
 * 前端選檔時與伺服器端簽發上傳網址、建立 item 時共用同一份規則。
 *
 * MIME 一律由副檔名決定，不採用瀏覽器回報的 file.type：它可以偽造，而且同一種檔案在
 * 不同系統上回報不同（Windows 上的 .csv 常是 application/vnd.ms-excel，.md／.yaml
 * 常是空字串）。副檔名同樣可以亂取，所以下載時另以 nosniff、attachment 與
 * CSP sandbox 保證內容不會在本站以 HTML／script 執行（見 /api/items/[id]/file）。
 */

export type UploadCategory = "image" | "file";

interface UploadRule {
  maxBytes: number;
  /** 副檔名（小寫、不含點）→ 存進資料庫與 R2 的 MIME */
  mimeTypes: Record<string, string>;
}

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<UploadCategory, UploadRule> = {
  image: {
    maxBytes: 5 * MB,
    mimeTypes: {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
    },
  },
  file: {
    maxBytes: 10 * MB,
    mimeTypes: {
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      yaml: "application/x-yaml",
      yml: "application/x-yaml",
      xml: "application/xml",
      csv: "text/csv",
      toml: "application/toml",
      ini: "text/plain",
    },
  },
};

/** FILE kind 的系統型別 slug → 上傳規則；其他型別不能上傳 */
const CATEGORY_BY_TYPE_SLUG: Record<string, UploadCategory> = {
  images: "image",
  files: "file",
};

export function getUploadCategory(typeSlug: string): UploadCategory | null {
  return CATEGORY_BY_TYPE_SLUG[typeSlug] ?? null;
}

/** <input type="file" accept> 用的副檔名清單 */
export function getAcceptAttribute(category: UploadCategory): string {
  return Object.keys(UPLOAD_RULES[category].mimeTypes)
    .map((extension) => `.${extension}`)
    .join(",");
}

/** 原始檔名的上限；超過的檔名多半是惡意或誤用，不存進資料庫 */
export const MAX_FILE_NAME_LENGTH = 255;

export type UploadValidation =
  | { ok: true; extension: string; mimeType: string }
  | { ok: false; error: string };

export function validateUpload(
  category: UploadCategory,
  fileName: string,
  size: number,
): UploadValidation {
  const rule = UPLOAD_RULES[category];
  const extension = getExtension(fileName);
  const mimeType = extension ? rule.mimeTypes[extension] : undefined;

  if (fileName.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, error: "File name is too long" };
  }
  if (!extension || !mimeType) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${getAcceptAttribute(category).replaceAll(",", ", ")}`,
    };
  }
  if (!Number.isSafeInteger(size) || size <= 0) {
    return { ok: false, error: "The file is empty" };
  }
  if (size > rule.maxBytes) {
    return {
      ok: false,
      error: `File must be ${rule.maxBytes / MB} MB or smaller`,
    };
  }
  return { ok: true, extension, mimeType };
}

function getExtension(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  // ".png" 這種只有副檔名的檔名不算有副檔名
  if (dot <= 0 || dot === fileName.length - 1) {
    return null;
  }
  return fileName.slice(dot + 1).toLowerCase();
}

/** R2 的 object key：伺服器產生，不含使用者提供的檔名，避免路徑穿越與特殊字元 */
export function buildStorageKey(
  userId: string,
  id: string,
  extension: string,
): string {
  return `users/${userId}/items/${id}.${extension}`;
}

const STORAGE_KEY_PATTERN =
  /^users\/([^/]+)\/items\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.([a-z0-9]+)$/;

/** 建立 item 時確認 key 是 buildStorageKey 為這個使用者產生的，不能拿別人的檔案建立 item */
export function isOwnStorageKey(storageKey: string, userId: string): boolean {
  return STORAGE_KEY_PATTERN.exec(storageKey)?.[1] === userId;
}

/**
 * 下載用的 Content-Disposition。filename 參數只能放 ASCII，其他字元與引號換成底線；
 * filename* 以 RFC 5987 帶完整的 UTF-8 檔名，現代瀏覽器優先採用它。
 */
export function contentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export function isImageMimeType(mimeType: string | null): boolean {
  return mimeType?.startsWith("image/") ?? false;
}

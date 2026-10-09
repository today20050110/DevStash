"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { FileIcon, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getAcceptAttribute,
  UPLOAD_RULES,
  validateUpload,
  type UploadCategory,
} from "@/lib/file-types";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  storageKey: string;
  fileName: string;
  size: number;
  /** 本機的 object URL，只在圖片時有，供上傳後預覽 */
  previewUrl: string | null;
}

interface FileUploadProps {
  category: UploadCategory;
  itemTypeId: string;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  /** 上傳中時父層停用 Create */
  onUploadingChange: (uploading: boolean) => void;
  /** 伺服器端（createItem）回傳的錯誤 */
  error?: string;
}

interface UploadResponse {
  success: boolean;
  data?: { uploadUrl: string; storageKey: string; mimeType: string };
  error?: string;
}

/**
 * 拖放或點擊選檔，先向 /api/uploads 取得 presigned 網址，再由瀏覽器直接 PUT 到 R2，
 * 以 XHR 的 upload.onprogress 顯示進度（fetch 沒有上傳進度事件）。
 * 白名單與大小先在前端檢查以立即回饋，伺服器端會再檢查一次。
 */
export function FileUpload({
  category,
  itemTypeId,
  value,
  onChange,
  onUploadingChange,
  error,
}: FileUploadProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 關閉 dialog 或切換型別時中止進行中的上傳。取得上傳網址與 PUT 兩段都要能中止：
  // 只中止 XHR 的話，在等 /api/uploads 回應期間 unmount 時 XHR 還不存在，
  // 上傳會照常完成並把結果寫回已重設的表單
  useEffect(() => () => abortRef.current?.abort(), []);
  // 預覽用的 object URL 不再顯示時釋放
  useEffect(() => {
    const previewUrl = value?.previewUrl;
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [value?.previewUrl]);

  const uploading = progress !== null;
  const rule = UPLOAD_RULES[category];
  const accept = getAcceptAttribute(category);

  async function upload(file: File) {
    setUploadError(null);
    const validation = validateUpload(category, file.name, file.size);
    if (!validation.ok) {
      setUploadError(validation.error);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    onUploadingChange(true);
    try {
      const target = await requestUploadUrl(
        itemTypeId,
        file,
        controller.signal,
      );
      await putFile(
        target.uploadUrl,
        target.mimeType,
        file,
        controller.signal,
        setProgress,
      );
      onChange({
        storageKey: target.storageKey,
        fileName: file.name,
        size: file.size,
        previewUrl: category === "image" ? URL.createObjectURL(file) : null,
      });
    } catch (uploadFailure) {
      if (!(
        uploadFailure instanceof DOMException &&
        uploadFailure.name === "AbortError"
      )) {
        setUploadError(
          uploadFailure instanceof Error
            ? uploadFailure.message
            : "Upload failed, please try again",
        );
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
      onUploadingChange(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 清空後再次選同一個檔案仍會觸發 change
    event.target.value = "";
    if (file) {
      void upload(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !uploading) {
      void upload(file);
    }
  }

  const message = uploadError ?? error;

  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          {value.previewUrl ? (
            // 本機 blob: 網址，next/image 無法處理
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.previewUrl}
              alt=""
              className="size-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <FileIcon className="size-8 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.size)} · Uploaded
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(null)}
            aria-label="Remove file"
            title="Remove file"
          >
            <X />
          </Button>
        </div>
        {message && <FileError id={`${inputId}-error`} message={message} />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/40",
          "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          dragging && "border-ring bg-muted/40",
          message && "border-destructive",
          uploading && "pointer-events-none",
        )}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={uploading}
          aria-invalid={Boolean(message) || undefined}
          aria-describedby={message ? `${inputId}-error` : undefined}
          className="sr-only"
        />
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="size-6 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {uploading
            ? `Uploading… ${progress}%`
            : "Drop a file here or click to browse"}
        </span>
        <span className="text-xs text-muted-foreground">
          {accept.replaceAll(",", " ")} · up to {formatFileSize(rule.maxBytes)}
        </span>
      </label>
      {uploading && (
        <div
          role="progressbar"
          aria-label="Upload progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          {/* 寬度隨上傳進度變化，無法寫成固定的 Tailwind class */}
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {message && <FileError id={`${inputId}-error`} message={message} />}
    </div>
  );
}

function FileError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

async function requestUploadUrl(
  itemTypeId: string,
  file: File,
  signal: AbortSignal,
) {
  // 中止時 fetch 以 AbortError reject，呼叫端不顯示錯誤
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemTypeId, fileName: file.name, size: file.size }),
    signal,
  });
  const body = (await response
    .json()
    .catch(() => null)) as UploadResponse | null;
  if (!response.ok || !body?.success || !body.data) {
    throw new Error(body?.error ?? "Upload failed, please try again");
  }
  return body.data;
}

/** Content-Type 必須與簽章時相同，否則 R2 回 403 */
function putFile(
  url: string,
  mimeType: string,
  file: File,
  signal: AbortSignal,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 回應 json 解析完到這裡之間也可能已被中止
    if (signal.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }
    const xhr = new XMLHttpRequest();
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload failed, please try again"));
    xhr.onerror = () => reject(new Error("Upload failed, please try again"));
    xhr.onabort = () =>
      reject(new DOMException("Upload aborted", "AbortError"));
    xhr.send(file);
  });
}

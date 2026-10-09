import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** 上傳網址的有效期；只用來立刻上傳，不需要更長 */
const UPLOAD_URL_TTL_SECONDS = 5 * 60;

let client: S3Client | undefined;

/**
 * R2 走 S3 相容 API。bucket 維持私有：不使用 R2_PUBLIC_URL，讀取一律經
 * /api/items/[id]/file 驗證擁有者後由伺服器轉送。延後到第一次使用才建立，
 * 缺設定時只有檔案相關功能失敗。
 */
function getClient(): S3Client {
  if (!client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 is not configured");
    }
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      // SDK 預設替 PutObject 加上 CRC32 checksum；presigned 網址簽發時沒有檔案內容，
      // 算出來的是空內容的 checksum，瀏覽器上傳實際檔案時會被拒絕
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2 is not configured");
  }
  return bucket;
}

/**
 * 瀏覽器直傳 R2 用的 presigned PUT 網址（§4.1；Vercel 函式的 request body 上限
 * 4.5 MB，檔案不經過我們的 API route）。Content-Type 與 Content-Length 都列入簽章，
 * 瀏覽器送出不同的類型或大小時 R2 會拒絕，不能用同一個網址上傳更大的檔案。
 */
export function createUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  );
}

export interface StoredObjectInfo {
  size: number;
  contentType: string | null;
}

/** 物件的實際大小與類型；不存在時回傳 null */
export async function headObject(
  key: string,
): Promise<StoredObjectInfo | null> {
  try {
    const result = await getClient().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return {
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? null,
    };
  } catch (error) {
    if (error instanceof NotFound || error instanceof NoSuchKey) {
      return null;
    }
    throw error;
  }
}

/** 物件內容的串流；不存在時回傳 null */
export async function getObjectStream(
  key: string,
): Promise<ReadableStream | null> {
  try {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return result.Body?.transformToWebStream() ?? null;
  } catch (error) {
    if (error instanceof NoSuchKey || error instanceof NotFound) {
      return null;
    }
    throw error;
  }
}

/** 刪除物件；S3 API 對不存在的 key 同樣回成功，重試是安全的 */
export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}

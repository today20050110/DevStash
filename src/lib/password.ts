import { randomBytes } from "node:crypto";

import { compare, hash } from "bcryptjs";

// 與 prisma/seed.ts 的 demo 使用者相同
const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

let dummyHash: Promise<string> | undefined;

/**
 * 查無帳號或帳號沒有密碼時也跑一次 bcrypt 比對，讓回應時間與「密碼錯誤」相近，
 * 無法用時間差判斷 email 是否已註冊。假雜湊以同樣的成本參數產生並快取。
 */
export async function verifyAgainstDummyHash(password: string): Promise<void> {
  dummyHash ??= hash(randomBytes(16).toString("hex"), BCRYPT_ROUNDS);
  await compare(password, await dummyHash);
}

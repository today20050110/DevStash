import { Resend } from "resend";

// 尚未在 Resend 驗證自有網域：只能從這個地址寄出，且只能寄給 Resend 帳號本人
const FROM_ADDRESS = "DevStash <onboarding@resend.dev>";

let resend: Resend | undefined;

// 延後到第一次寄信才建立：缺少 RESEND_API_KEY 時只讓寄信失敗，不影響整個模組載入
function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

interface EmailContent {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function sendEmail(content: EmailContent): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    ...content,
  });
  // Resend SDK 不會丟出例外，失敗以回傳值表示
  if (error) {
    throw new Error(`Failed to send "${content.subject}": ${error.message}`);
  }
}

// 連結放進 HTML 屬性前，把 query string 的 & 轉成 &amp;
function escapeHref(url: string): string {
  return url.replaceAll("&", "&amp;");
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  expiresInHours: number,
): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your DevStash email",
    text: [
      "Welcome to DevStash!",
      "",
      "Confirm your email address by opening the link below:",
      verifyUrl,
      "",
      `The link expires in ${expiresInHours} hours. If you didn't create an account, you can ignore this email.`,
    ].join("\n"),
    html: `
      <p>Welcome to DevStash!</p>
      <p>Confirm your email address by clicking the link below:</p>
      <p><a href="${escapeHref(verifyUrl)}">Verify email</a></p>
      <p>The link expires in ${expiresInHours} hours. If you didn't create an account, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  expiresInMinutes: number,
): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your DevStash password",
    text: [
      "Someone requested a password reset for your DevStash account.",
      "",
      "Choose a new password by opening the link below:",
      resetUrl,
      "",
      `The link expires in ${expiresInMinutes} minutes and can only be used once. If you didn't request this, you can ignore this email — your password won't change.`,
    ].join("\n"),
    html: `
      <p>Someone requested a password reset for your DevStash account.</p>
      <p>Choose a new password by clicking the link below:</p>
      <p><a href="${escapeHref(resetUrl)}">Reset password</a></p>
      <p>The link expires in ${expiresInMinutes} minutes and can only be used once. If you didn't request this, you can ignore this email — your password won't change.</p>
    `,
  });
}

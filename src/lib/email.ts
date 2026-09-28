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

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  expiresInHours: number,
): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
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
      <p><a href="${verifyUrl.replaceAll("&", "&amp;")}">Verify email</a></p>
      <p>The link expires in ${expiresInHours} hours. If you didn't create an account, you can ignore this email.</p>
    `,
  });
  // Resend SDK 不會丟出例外，失敗以回傳值表示
  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

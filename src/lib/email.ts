import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "VerShare <onboarding@resend.dev>";

function makeHtml(code: string) {
  return `
    <div style="font-family: monospace; background: #0a0a1a; color: #e0e0e8; padding: 32px; max-width: 400px;">
      <h2 style="color: #39ff14; font-size: 14px; margin-bottom: 24px;">&gt; VERSHARE VERIFICATION</h2>
      <p style="color: #888899; font-size: 13px; margin-bottom: 16px;">Your verification code:</p>
      <div style="background: #111118; border: 1px solid rgba(57,255,20,0.3); padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="color: #39ff14; font-size: 28px; letter-spacing: 8px; font-weight: bold;">${code}</span>
      </div>
      <p style="color: #888899; font-size: 12px;">Enter this code to verify your email and unlock permanent shares.</p>
      <hr style="border: none; border-top: 1px solid rgba(57,255,20,0.1); margin: 24px 0;">
      <p style="color: #555566; font-size: 11px;">If you didn't create an account, ignore this email.</p>
    </div>
  `;
}

function makeText(code: string) {
  return `Your VerShare verification code is: ${code}\n\nEnter this code to verify your email and unlock permanent shares.\n\nIf you didn't create an account, ignore this email.`;
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    // No email provider configured — dev mode, code shown in UI
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your verification code: ${code}`,
      html: makeHtml(code),
      text: makeText(code),
    });
    return true;
  } catch (err) {
    console.error("Resend failed:", err);
    return false;
  }
}

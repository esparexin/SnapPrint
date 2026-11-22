export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderRegistrationOtpEmail(code: string, expiryMinutes = 15): RenderedEmail {
  const subject = `SnapPrint Verification Code: ${code}`;
  const text = `Welcome to SnapPrint!\n\nYour studio owner registration verification code is:\n\n${code}\n\nThis single-use code will expire in ${expiryMinutes} minutes.\nIf you did not request this registration code, please disregard this email.`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111827; background-color: #f9fafb;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb;">
    <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Welcome to SnapPrint</h2>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Use the verification code below to complete your studio owner registration:</p>
    <div style="text-align: center; margin: 28px 0; padding: 18px; background: #f3f4f6; border-radius: 6px;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1f2937; font-family: monospace;">${code}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">This single-use code expires in ${expiryMinutes} minutes.<br>If you did not sign up for SnapPrint, please ignore this message.</p>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">SnapPrint — Autonomous Studio & Xerox Printing Platform</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export function renderLoginOtpEmail(code: string, expiryMinutes = 15): RenderedEmail {
  const subject = `SnapPrint Login Code: ${code}`;
  const text = `Hello from SnapPrint!\n\nYour studio owner login verification code is:\n\n${code}\n\nThis single-use code will expire in ${expiryMinutes} minutes.\nIf you did not attempt to sign in, your account remains secure. Do not share this code.`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111827; background-color: #f9fafb;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb;">
    <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Studio Owner Sign In</h2>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Enter the verification code below to sign in to your SnapPrint studio portal:</p>
    <div style="text-align: center; margin: 28px 0; padding: 18px; background: #f3f4f6; border-radius: 6px;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1f2937; font-family: monospace;">${code}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">This single-use code expires in ${expiryMinutes} minutes.<br>If you did not request this login code, your account remains secure. Do not share this code with anyone.</p>
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">SnapPrint — Autonomous Studio & Xerox Printing Platform</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

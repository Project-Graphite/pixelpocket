// The password reset email, styled like the website. Email clients ignore most modern
// CSS, so the layout uses tables and inline styles.

// The pixel face from the logo, one character per pixel
const FACE = ['.#....#.', '.#....#.', '........', '........', '.#....#.', '..####..'];

const pixel = (on) =>
    `<td style="width:8px;height:8px;font-size:0;line-height:0;${on ? 'background:#25381a;' : ''}">&nbsp;</td>`;

const face = FACE.map(
    (row) => `<tr>${[...row].map((c) => pixel(c === '#')).join('')}</tr>`,
).join('');

module.exports = (resetURL) => ({
    subject: 'Your PixelPocket password reset link',
    text: `Forgot your password? Open this link to choose a new one (valid for 10 minutes):
${resetURL}

If you didn't ask for this, you can ignore this email.`,
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#eceff3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceff3;font-family:Archivo,'Segoe UI',Arial,sans-serif;color:#0f1a33;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td style="padding:18px 24px;background:#2341c4;border:2px solid #142a8f;border-radius:10px 10px 0 0;color:#ffffff;font-size:28px;font-weight:900;letter-spacing:-0.5px;">PixelPocket</td></tr>
    <tr><td style="padding:28px 24px;background:#ffffff;border:2px solid #0f1a33;border-top:0;border-radius:0 0 10px 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;background:#a9c97a;border:6px solid #1d2445;border-radius:8px;">
        <tr><td style="padding:14px 20px;"><table role="presentation" cellpadding="0" cellspacing="0">${face}</table></td></tr>
      </table>
      <span style="display:inline-block;padding:4px 10px;background:#ffd43b;border:2px solid #0f1a33;border-radius:4px;font-size:13px;font-weight:700;">Password reset</span>
      <h1 style="margin:14px 0 10px;font-size:24px;line-height:1.2;">Choose a new password</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#4a5675;">Someone asked to reset the password for your PixelPocket account. Use the button below to pick a new one. The link works for 10 minutes.</p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#2341c4;border:2px solid #142a8f;border-radius:8px;">
        <a href="${resetURL}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Choose a new password</a>
      </td></tr></table>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#4a5675;">If the button doesn't work, copy this link into your browser:<br><a href="${resetURL}" style="color:#2341c4;word-break:break-all;">${resetURL}</a></p>
    </td></tr>
    <tr><td style="padding:18px 8px 0;font-size:13px;line-height:1.5;color:#4a5675;text-align:center;">If you didn't ask for this, you can ignore this email. Your password won't change.</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`,
});

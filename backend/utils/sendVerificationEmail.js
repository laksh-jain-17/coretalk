const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const sendVerificationEmail = async (toEmail, token) => {
  const { token: accessToken } = await oauth2Client.getAccessToken();

  const verifyUrl = `${process.env.BACKEND_URL}/api/auth/verify-email/${token}`;

  const emailLines = [
    `To: ${toEmail}`,
    `From: "CoreTalk" <${process.env.GMAIL_USER}>`,
    `Subject: Verify your CoreTalk account`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<div style="font-family: helvetica, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color: #1e3a8a;">Welcome to CoreTalk</h2>
      <p>Click the button below to verify your email and activate your account.</p>
      <a href="${verifyUrl}"
        style="display:inline-block; margin:16px 0; padding:12px 24px;
        background:#1e3a8a; color:#fff; border-radius:8px;
        text-decoration:none; font-weight:600;">
          Verify My Email
      </a>
      <p style="color:#888; font-size:0.85rem;">
        This link expires in <strong>24 hours</strong>.<br>
        If you didn't sign up for CoreTalk, you can safely ignore this email.
      </p>
    </div>`
  ];

  const raw = Buffer.from(emailLines.join('\n'))
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gmail API error');
  }
};

module.exports = sendVerificationEmail;

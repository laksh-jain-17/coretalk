const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const sendOtpEmail = async (toEmail, otp) => {
  const { token } = await oauth2Client.getAccessToken();

  const emailLines = [
    `To: ${toEmail}`,
    `From: "CoreTalk" <${process.env.GMAIL_USER}>`,
    `Subject: Your CoreTalk Password Reset OTP`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<div style="font-family: helvetica, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color: #1e3a8a;">CoreTalk Password Reset</h2>
      <p>Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="font-size: 2.5rem; font-weight: bold; letter-spacing: 12px;
        color: #1e3a8a; background: #f0f4ff; padding: 20px;
        border-radius: 8px; text-align: center; margin: 24px 0;">${otp}</div>
      <p style="color: #888; font-size: 0.85rem;">
        If you did not request this, you can safely ignore this email.
        Never share this OTP with anyone.
      </p>
    </div>`
  ];

  const raw = Buffer.from(emailLines.join('\n'))
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gmail API error');
  }
};

module.exports = sendOtpEmail;

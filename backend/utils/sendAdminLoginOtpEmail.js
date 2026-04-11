const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const sendAdminLoginOtpEmail = async (toEmail, name, otp) => {
  const { token } = await oauth2Client.getAccessToken();

  const emailLines = [
    `To: ${toEmail}`,
    `From: "CoreTalk" <${process.env.GMAIL_USER}>`,
    `Subject: Your CoreTalk Admin Login OTP`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<div style="font-family: helvetica, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color: #1e3a8a;">Admin Login Verification</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>A login attempt was made on your CoreTalk admin account.
         Use the OTP below to complete sign-in. It expires in <strong>5 minutes</strong>.</p>
      <div style="font-size: 2.5rem; font-weight: bold; letter-spacing: 12px;
        color: #1e3a8a; background: #f0f4ff; padding: 20px;
        border-radius: 8px; text-align: center; margin: 24px 0;">${otp}</div>
      <p style="color: #888; font-size: 0.85rem;">
        If you did not attempt to log in, secure your account immediately.
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

module.exports = sendAdminLoginOtpEmail;

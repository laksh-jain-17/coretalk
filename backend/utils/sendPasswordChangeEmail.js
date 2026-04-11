const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const sendPasswordChangeEmail = async (toEmail, name) => {
  const { token } = await oauth2Client.getAccessToken();

  const changedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const emailLines = [
    `To: ${toEmail}`,
    `From: "CoreTalk" <${process.env.GMAIL_USER}>`,
    `Subject: Your CoreTalk password was changed`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<div style="font-family: helvetica, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color: #1e3a8a;">Password Changed Successfully</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your CoreTalk account password was changed on <strong>${changedAt}</strong>.</p>
      <p>If you made this change, no further action is needed.</p>
      <div style="background: #fff3f3; border-left: 4px solid #d32f2f;
        padding: 14px 16px; border-radius: 6px; margin: 20px 0; color: #b71c1c;">
        <strong>⚠️ If you did NOT make this change</strong>, your account may be
        compromised. Reset your password immediately.
      </div>
      <p style="color: #888; font-size: 0.85rem;">
        This is an automated security email from CoreTalk. Do not reply.
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

module.exports = sendPasswordChangeEmail;

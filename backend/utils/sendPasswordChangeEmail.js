const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const createTransporter = async () => {
  const { token } = await oauth2Client.getAccessToken();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: token,
    },
  });
};

const sendPasswordChangeEmail = async (toEmail, name) => {
  const transporter = await createTransporter();
  const changedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  await transporter.sendMail({
    from: `"CoreTalk" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your CoreTalk password was changed',
    html: `
      <div style="font-family: helvetica, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #1e3a8a;">Password Changed Successfully</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your CoreTalk account password was changed on <strong>${changedAt}</strong>.</p>
        <p>If you made this change, no further action is needed.</p>
        <div style="
          background: #fff3f3; border-left: 4px solid #d32f2f;
          padding: 14px 16px; border-radius: 6px; margin: 20px 0; color: #b71c1c;
        ">
          <strong>⚠️ If you did NOT make this change</strong>, your account may be
          compromised. Reset your password immediately.
        </div>
        <p style="color: #888; font-size: 0.85rem;">
          This is an automated security email from CoreTalk. Do not reply.
        </p>
      </div>
    `,
  });
};

module.exports = sendPasswordChangeEmail;

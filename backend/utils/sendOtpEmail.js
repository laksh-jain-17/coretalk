const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

//now debug//
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

const sendOtpEmail = async (toEmail, otp) => {
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"CoreTalk" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your CoreTalk Password Reset OTP',
    html: `
      <div style="font-family: helvetica, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #1e3a8a;">CoreTalk Password Reset</h2>
        <p>Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="
          font-size: 2.5rem; font-weight: bold; letter-spacing: 12px;
          color: #1e3a8a; background: #f0f4ff; padding: 20px;
          border-radius: 8px; text-align: center; margin: 24px 0;
        ">${otp}</div>
        <p style="color: #888; font-size: 0.85rem;">
          If you did not request this, you can safely ignore this email.
          Never share this OTP with anyone.
        </p>
      </div>
    `,
  });
};

module.exports = sendOtpEmail;

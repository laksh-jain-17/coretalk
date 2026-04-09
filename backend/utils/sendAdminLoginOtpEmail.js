const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const createTransporter = async () => {
  console.log('OAuth2 config check:', {
    clientId: process.env.GOOGLE_CLIENT_ID ? '✅ set' : '❌ MISSING',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '✅ set' : '❌ MISSING',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN ? '✅ set' : '❌ MISSING',
    user: process.env.GMAIL_USER ? '✅ set' : '❌ MISSING',
  });

  try {
    const { token } = await oauth2Client.getAccessToken();
    console.log('Access token:', token ? '✅ obtained' : '❌ NULL');
    if (!token) throw new Error('Access token is null');

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
  } catch (err) {
    console.error('createTransporter failed:', err.message);
    throw err;
  }
};

const sendAdminLoginOtpEmail = async (toEmail, name, otp) => {
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"CoreTalk" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your CoreTalk Admin Login OTP',
    html: `
      <div style="font-family: helvetica, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #1e3a8a;">Admin Login Verification</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>A login attempt was made on your CoreTalk admin account.
           Use the OTP below to complete sign-in. It expires in <strong>5 minutes</strong>.</p>
        <div style="
          font-size: 2.5rem; font-weight: bold; letter-spacing: 12px;
          color: #1e3a8a; background: #f0f4ff; padding: 20px;
          border-radius: 8px; text-align: center; margin: 24px 0;
        ">${otp}</div>
        <p style="color: #888; font-size: 0.85rem;">
          If you did not attempt to log in, secure your account immediately.
          Never share this OTP with anyone.
        </p>
      </div>
    `,
  });
};

module.exports = sendAdminLoginOtpEmail;

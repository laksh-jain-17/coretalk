const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
});

const sendAdminLoginOtpEmail = async (toEmail, name, otp) => {
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

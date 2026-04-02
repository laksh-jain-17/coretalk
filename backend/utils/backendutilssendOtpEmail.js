// backend/utils/sendOtpEmail.js
// Sends OTP emails via your Gmail account using Nodemailer.
// Requires GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,         // e.g. yourname@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // App Password — NOT your real Gmail password
  },
});

const sendOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"CoreTalk" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your CoreTalk Password Reset OTP',
    html: `
      <div style="font-family: helvetica, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #1e3a8a;">CoreTalk Password Reset</h2>
        <p>Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="
          font-size: 2.5rem;
          font-weight: bold;
          letter-spacing: 12px;
          color: #1e3a8a;
          background: #f0f4ff;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 24px 0;
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
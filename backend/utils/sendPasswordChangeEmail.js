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

const sendPasswordChangeEmail = async (toEmail, name) => {
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

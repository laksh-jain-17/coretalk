const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: { 
		user:process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});
const sendVerificationEmail = async (toEmail, token) => {
	const verifyUrl = `${process.env.BACKEND_URL}/api/auth/verify-email/${token}`;
	await transporter.sendMail({
		from: "CoreTalk" <${process.env.EMAIL_USER}>`,
		to: toEmail,
		subject: 'Verify your CoreTalk account',
		html:`
			<div style="font-family:sans-serif;max-width:480px;margin:auto">
				<h2 style="color:#6366f1">Welcome To Coretalk</h2>
				<p>Click the button below to verify your email and activate your account.</p>
				<a href="${verifyUrl}"
					style="display:inline-block;margin:16px 0;padding:12px 24px;
					background:#6366f1; color:#fff; border-radius:8px;
					text-decoration:none;font-weight:600">
						Verify My Email
				</a>
				<p style="color:#666;font-size:13px">
					This link expires in <strong>24 hours</string>.<br>
					If you didn't sign up for CoreTalk, you can safely ignore this email.
				</p>
			</div>
			`,
		});
	};
module.exports = sendVerificationEmail;
			

const User    = require('../models/User');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const sendAdminLoginOtpEmail = require('../utils/sendAdminLoginOtpEmail');

const generateOtp = () => String(crypto.randomInt(100000, 999999));
const hashOtp     = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password.' });

    // ✅ Point 3 — admin gets OTP challenge instead of direct token
    if (user.isAdmin) {
      const otp = generateOtp();
      user.adminLoginOtp      = hashOtp(otp);
      user.adminLoginOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
      await user.save();

      await sendAdminLoginOtpEmail(user.email, user.name, otp);

      return res.status(200).json({
        requiresAdminOtp: true,
        email: user.email,
        message: 'OTP sent to your admin email. Please verify to complete login.',
      });
    }

    // Normal user — token issued directly
    const token = jwt.sign(
      { id: user._id, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: false },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { login };

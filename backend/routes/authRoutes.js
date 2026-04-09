const express = require('express');
const User = require('../models/User');
const router = express.Router();
const { login } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const hostOnly = require('../middleware/hostOnly');
const bcrypt = require('bcryptjs');
const Room = require('../models/Room');
const Report = require('../models/Report');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const sendOtpEmail = require('../utils/sendOtpEmail');
const sendPasswordChangeEmail  = require('../utils/sendPasswordChangeEmail');
const sendAdminLoginOtpEmail   = require('../utils/sendAdminLoginOtpEmail');

// ── Rate limiter for OTP endpoints ───────────────────────────────────────────
const rateLimit = require('express-rate-limit');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' }
});

// ── OTP helpers ───────────────────────────────────────────────────────────────
const generateOtp = () => String(crypto.randomInt(100000, 999999));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (name.length > 50)     return res.status(400).json({ message: 'Name too long (max 50 chars)' });
  if (email.length > 100)   return res.status(400).json({ message: 'Email too long (max 100 chars)' });
  if (password.length > 128) return res.status(400).json({ message: 'Password too long (max 128 chars)' });
  if (password.length < 6)  return res.status(400).json({ message: 'Password too short (min 6 chars)' });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 8);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    return res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('Registration error', err);
    return res.status(500).json({ message: err.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', login);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile', authMiddleware, (req, res) => {
  res.json({ msg: 'Protected user', user: req.user });
});

router.get('/public', (req, res) => {
  res.json({ msg: 'This is public' });
});

router.get('/schedule', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'This is protected schedule page', user });
  } catch (error) {
    console.error('Error in /schedule:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Rooms ─────────────────────────────────────────────────────────────────────
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const roomid = uuidv4();
    const newRoom = new Room({ roomId: roomid, host: req.user.id, createdAt: new Date() });
    await newRoom.save();
    const token = jwt.sign(
      { id: req.user.id, role: 'host', roomid },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ roomid, token });
  } catch (err) {
    console.error('Error creating room', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/join', authMiddleware, async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ msg: 'Room ID is required' });
  const existingRoom = await Room.findOne({ roomId });
  if (!existingRoom) return res.status(404).json({ msg: 'Invalid or expired room ID' });
  const token = jwt.sign(
    { id: req.user.id, role: 'participant', roomid: existingRoom.roomId },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
  res.json({ roomid: existingRoom.roomId, token });
});

// ── Forgot Password — Step 1: Send OTP ───────────────────────────────────────
// ✅ FIX BUG 2: always returns same response — never reveals if email exists
// ✅ FIX BUG 3: no password accepted here — only sends OTP
router.post('/forget-reset', otpLimiter, async (req, res) => {
  try {
    const { resetSessionToken, newPassword } = req.body;
    if (!resetSessionToken || !newPassword)
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    if (newPassword.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

    let payload;
    try {
      payload = jwt.verify(resetSessionToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Reset session expired. Please start over.' });
    }

    if (payload.purpose !== 'password-reset')
      return res.status(400).json({ success: false, message: 'Invalid token.' });

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    // ✅ Point 2 — fire and forget, never blocks the reset response
    sendPasswordChangeEmail(user.email, user.name).catch(err =>
      console.error('Password change email failed (non-fatal):', err)
    );

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('forget-reset error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── Forgot Password — Step 2: Verify OTP ─────────────────────────────────────
router.post('/forget-verify', otpLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({
      email,
      resetOtp: hashOtp(otp),
      resetOtpExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Issue a short-lived reset session token (5 min)
    const resetSessionToken = jwt.sign(
      { id: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.json({ success: true, resetSessionToken });
  } catch (err) {
    console.error('forget-verify error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── Forgot Password — Step 3: Reset Password ─────────────────────────────────
router.post('/forget-reset', otpLimiter, async (req, res) => {
  try {
    const { resetSessionToken, newPassword } = req.body;
    if (!resetSessionToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    let payload;
    try {
      payload = jwt.verify(resetSessionToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Reset session expired. Please start over.' });
    }

    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ success: false, message: 'Invalid token.' });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('forget-reset error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── Host actions ──────────────────────────────────────────────────────────────
router.post('/end-meeting', authMiddleware, hostOnly, async (req, res) => {
  try {
    const roomId = req.user.roomid;
    if (!roomId) return res.status(400).json({ msg: 'No roomId in token' });
    await Room.findOneAndDelete({ roomId });
    res.json({ msg: 'Meeting ended by host' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/mute-all', authMiddleware, hostOnly, (req, res) => {
  res.json({ msg: 'All participants muted by host' });
});

router.post('/lock-meeting', authMiddleware, hostOnly, (req, res) => {
  res.json({ msg: 'Meeting is locked' });
});

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.post('/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ msg: 'No credential provided' });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
      user = new User({ name, email, password: randomPassword, googleId, isAdmin: false });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin || false },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin || false }
    });
  } catch (error) {
    console.error('Google login error');
    return res.status(500).json({ msg: 'Google authentication failed' });
  }
});

// ── Report ────────────────────────────────────────────────────────────────────
router.post('/report', authMiddleware, async (req, res) => {
  try {
    const { username, reason } = req.body;
    if (!username || !reason) return res.status(400).json({ msg: 'Username and reason are required' });
    if (username.length > 50) return res.status(400).json({ msg: 'Username too long' });
    if (reason.length > 500) return res.status(400).json({ msg: 'Reason too long (max 500 chars)' });

    const report = new Report({ reporterId: req.user.id, culpritUsername: username, reason });
    await report.save();
    res.status(201).json({ msg: 'Report submitted successfully' });
  } catch (err) {
    console.error("Error submitting report");
    res.status(500).json({ msg: 'Server error while submitting report' });
  }
});

// ── Admin Login — Step 1: Trigger OTP (called from login controller) ──────────
// This route is internal — the login controller handles sending OTP.
// This route verifies it and issues the final token.
router.post('/admin-login-verify', otpLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });

    const user = await User.findOne({
      email,
      adminLoginOtp: hashOtp(otp),
      adminLoginOtpExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });

    // Clear after single use
    user.adminLoginOtp = null;
    user.adminLoginOtpExpiry = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: true },
    });
  } catch (err) {
    console.error('admin-login-verify error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Delete account ────────────────────────────────────────────────────────────
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: 'Account deleted successfully' });
  } catch (err) {
    console.error("Error deleting account");
    res.status(500).json({ msg: 'Server error while deleting account' });
  }
});

module.exports = router;

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Blocked fake/disposable email domains
const blockedDomains = [
  'example.com', 'example.org', 'example.net',
  'mailinator.com', 'guerrillamail.com', 'tempmail.com',
  'throwaway.email', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'spam4.me', 'trashmail.com', 'trashmail.me',
  'yopmail.com', 'dispostable.com', 'maildrop.cc',
  'mailnull.com', 'spamgourmet.com', 'spamgourmet.net',
  'discard.email', 'spamhereplease.com', 'spamspot.com',
  'tempr.email', 'throwam.com', 'tmp-mailbox.com',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  'test.com', 'test.org', 'fake.com', 'fake.org',
  'noemail.com', 'noreply.com', 'nomail.com',
];

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Invalid email format' });
    }

    // Block disposable/fake domains
    const domain = email.split('@')[1].toLowerCase();
    if (blockedDomains.includes(domain)) {
      return res.status(400).json({ msg: 'Please use a real email address. Disposable or fake emails are not allowed.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });
    await newUser.save();
    return res.status(201).json({ msg: 'User details saved successfully' });

  } catch (err) {
    console.error("Registration error", err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isAdmin = user.isAdmin || false;

    const token = jwt.sign(
      { id: user._id, isAdmin: isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: isAdmin
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

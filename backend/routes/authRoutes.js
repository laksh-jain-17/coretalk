const express = require('express');
const User = require('../models/User');
const router = express.Router();
const { login } = require('../controllers/authController'); // only import what you use
const authMiddleware = require('../middleware/authMiddleware');
const hostOnly = require('../middleware/hostOnly');
const bcrypt = require('bcryptjs');
const Room = require('../models/Room'); // use PascalCase for model variable (optional)
const Report = require('../models/Report');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');


router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
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

router.post('/login', login);

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

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const roomid = uuidv4();
    const newRoom = new Room({
      roomId: roomid,
      host: req.user.id,
      createdAt: new Date()
    });
    await newRoom.save();

    // Return a room-specific token that marks the caller as the host of this room
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

/*router.post('/forget', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, email: 'Email not registered' });
  user.password = await bcrypt.hash(password, 10);
  await user.save();
  res.json({ success: true });
});*/

/*router.post('/forget', async (req, res) => {				Its previous function changed to prevent email harvesting and absence of OTP issue
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not registered' });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});*/

router.post('/forget', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
 
    // ✅ BUG 2 FIX: don't reveal whether the email is registered or not.
    // If user doesn't exist, just silently do nothing and return success.
    if (user) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }
 
    // Always return the same response either way
    res.json({ success: true, message: 'If that email is registered, the password has been updated.' });
 
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

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
  // Ideally emit socket event to connected participants from server side
  res.json({ msg: 'All participants muted by host' });
});

router.post('/lock-meeting', authMiddleware, hostOnly, (req, res) => {
  res.json({ msg: 'Meeting is locked' });
});

// Google OAuth Login
router.post('/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ msg: 'No credential provided' });
    }

    // Verify the Google token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    console.log('Google login attempt:', { email, name });

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with Google account
      const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
      
      user = new User({
        name: name,
        email: email,
        password: randomPassword,
        googleId: googleId,
        isAdmin: false
      });
      
      await user.save();
      console.log('New user created via Google:', email);
    } else {
      // Update googleId if user exists but doesn't have it
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin || false },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin || false
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ msg: 'Google authentication failed' });
  }
});

router.post('/report',authMiddleware,async(req,res) => {
	try
	{
		const {username,reason} = req.body;
		if(!username || !reason)
		{
			return res.status(400).json({msg:'Username and reason are required'});
		}
		const report = new Report({
			reporterId: req.user.id,
			culpritUsername: username,
			reason,
		});
		await report.save();
		res.status(201).json({msg:'Report submitted successfully'});
	}
	catch(err)
	{
		console.error("Error submitting report ",err);
		res.status(500).json({msg:'Server error while submitting report'});
	}
});
	
router.delete('/delete-account',authMiddleware,async(req,res) => { 
	try
	{
		const userId = req.user.id;
		await User.findByIdAndDelete(userId);
		res.json({msg:'Account deleted successfully'});
	}
	catch(err)
	{
		console.error("Error deleting account " , err);
		res.status(500).json({msg:'Server error while deleting account'});
	}	
});	

module.exports = router;


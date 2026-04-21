const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Room = require('../models/Room');

router.post('/token', authMiddleware, async (req, res) => {
  const { roomName, participantName } = req.body;

  // Validate request body
  if (!roomName || !participantName) {
    return res.status(400).json({
      error: 'roomName and participantName are required'
    });
  }

  // Validate environment variables
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
    console.error('Missing LiveKit env vars:', {
      hasKey: !!process.env.LIVEKIT_API_KEY,
      hasSecret: !!process.env.LIVEKIT_API_SECRET,
      hasUrl: !!process.env.LIVEKIT_URL,
    });
    return res.status(500).json({
      error: 'Server configuration error - missing LiveKit credentials'
    });
  }

  try {
    // Derive isHost from DB — never trust the client
    const room = await Room.findOne({ roomId: roomName });
    const isHost = room ? room.host.toString() === req.user.id : false;

    // Create access token
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: req.user.id,
        name: participantName,
        metadata: JSON.stringify({ isHost }),
      }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();

    // Validate the generated token
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      console.error('Invalid token generated:', token);
      return res.status(500).json({ error: 'Token generation failed - invalid format' });
    }

    return res.status(200).json({
      token,
      url: process.env.LIVEKIT_URL,
    });

  } catch (error) {
    console.error('Error generating LiveKit token:', error.message);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

// ✅ NEW: guest token — no authMiddleware, identity comes from the admitted guestId
router.post('/guest-token', async (req, res) => {
  const { roomName, participantName, guestId } = req.body;

  if (!roomName || !guestId) {
    return res.status(400).json({ error: 'roomName and guestId are required' });
  }

  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: guestId,                        // stable — matches what the host admitted
        name: participantName || 'Guest',
        metadata: JSON.stringify({ isHost: false }),
      }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const token = await at.toJwt();

    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      return res.status(500).json({ error: 'Token generation failed' });
    }

    return res.status(200).json({ token, url: process.env.LIVEKIT_URL });
  } catch (error) {
    console.error('Error generating guest LiveKit token:', error.message);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;

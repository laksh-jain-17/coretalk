const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Room = require('../models/Room');

// FIX #5: Protect the token endpoint with authMiddleware.
// Also derive isHost from the database — never trust the client payload.
router.post('/token', authMiddleware, async (req, res) => {
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({
      error: 'roomName and participantName required'
    });
  }

  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
    return res.status(500).json({
      error: 'Server configuration error - missing LiveKit credentials'
    });
  }

  try {
    // Derive isHost from DB, never from req.body
    const room = await Room.findOne({ roomId: roomName });
    const isHost = room ? room.host.toString() === req.user.id : false;

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: req.user.id,
        name: participantName,
        metadata: JSON.stringify({ isHost })
      }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true
    });

    let token = await at.toJwt();

    if (typeof token !== 'string') {
      if (typeof token === 'object' && token !== null) {
        if (token.token) token = token.token;
        else if (token.jwt) token = token.jwt;
        else if (token.value) token = token.value;
        else token = String(token);
      } else {
        token = String(token);
      }
    }

    if (token === '[object Object]' || token.split('.').length !== 3) {
      return res.status(500).json({ error: 'Token generation failed - invalid format' });
    }

    res.json({ token, url: process.env.LIVEKIT_URL });

  } catch (error) {
    console.error('Error generating LiveKit token:', error.message);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});


module.exports = router;

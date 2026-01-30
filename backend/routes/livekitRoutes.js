const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const router = express.Router();

router.post('/token', (req, res) => {
  const { roomName, participantName, userId, isHost } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'roomName and participantName required' });
  }

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: userId || participantName,
        name: participantName,
      }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = at.toJwt();
    
    res.json({ 
      token,
      url: process.env.LIVEKIT_URL 
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;

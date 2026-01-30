const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const router = express.Router();

router.post('/token', (req, res) => {
  const { roomName, participantName, userId, isHost } = req.body;

  console.log('Token request:', { roomName, participantName, userId, isHost });

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'roomName and participantName required' });
  }

  // Verify environment variables exist
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
    console.error('Missing LiveKit environment variables!');
    return res.status(500).json({ error: 'Server configuration error' });
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
    
    console.log('Token generated successfully for:', participantName);
    
    res.json({ 
      token: token,  // Make sure it's the string, not the object
      url: process.env.LIVEKIT_URL 
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
});

module.exports = router;

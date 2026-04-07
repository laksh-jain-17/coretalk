const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.post('/token', async (req, res) => {  // ← ADDED async here
  console.log('\n========== LIVEKIT TOKEN REQUEST ==========');
  
  const { roomName, participantName, userId, isHost } = req.body;
  
  console.log('Request body:', { roomName, participantName, userId, isHost });
  
  // Validate inputs
  if (!roomName || !participantName) {
    console.error('❌ Missing required fields');
    return res.status(400).json({ 
      error: 'roomName and participantName required',
      received: { roomName, participantName }
    });
  }
  
  // Verify environment variables exist
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
    console.error('❌ Missing LiveKit environment variables!');
    console.error('LIVEKIT_API_KEY:', process.env.LIVEKIT_API_KEY ? 'SET' : 'MISSING');
    console.error('LIVEKIT_API_SECRET:', process.env.LIVEKIT_API_SECRET ? 'SET' : 'MISSING');
    console.error('LIVEKIT_URL:', process.env.LIVEKIT_URL ? 'SET' : 'MISSING');
    return res.status(500).json({ 
      error: 'Server configuration error - missing LiveKit credentials'
    });
  }
  
  try {
    // Create AccessToken
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: userId || participantName,
        name: participantName,
        metadata: JSON.stringify({ isHost: isHost || false })
      }
    );
    
    // Add grants
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true
    });
    
    // ========================================
    // CRITICAL FIX: AWAIT the toJwt() Promise
    // ========================================
    let token = await at.toJwt();  // ← ADDED await here!
    
    console.log('Token after await:', typeof token);
    
    // Handle if it's still not a string
    if (typeof token !== 'string') {
      console.error('❌ Token is not a string after await');
      console.error('Token type:', typeof token);
      console.error('Token value:', token);
      
      // Try to extract from object
      if (typeof token === 'object' && token !== null) {
        if (token.token) token = token.token;
        else if (token.jwt) token = token.jwt;
        else if (token.value) token = token.value;
        else token = String(token);
      } else {
        token = String(token);
      }
    }
    
    // Validate it's not [object Object]
    if (token === '[object Object]') {
      console.error('❌ Token is "[object Object]"');
      return res.status(500).json({ 
        error: 'Token generation failed - invalid format'
      });
    }
    
    // Validate JWT structure
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Invalid JWT structure - parts:', tokenParts.length);
      return res.status(500).json({ 
        error: 'Token generation failed - invalid JWT structure',
        parts: tokenParts.length
      });
    }
    
    console.log('✅ Token generated successfully');
    console.log('   Participant:', participantName);
    console.log('   Room:', roomName);
    console.log('   Token type:', typeof token);
    console.log('   Token length:', token.length);
    console.log('   Token preview:', token.substring(0, 50) + '...');
    console.log('   JWT structure:', tokenParts.length, 'parts');
    
    // Return response
    const response = {
      token: token,
      url: process.env.LIVEKIT_URL
    };
    
    console.log('✅ Sending response');
    console.log('===========================================\n');
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error generating LiveKit token:', error);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate token', 
      details: error.message
    });
  }
});

// ========================================
// TEST ENDPOINT
// ========================================
router.get('/test', authMiddleware, async (req, res) => {
  console.log('\n========== LIVEKIT TEST REQUEST ==========');
  
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return res.json({
      success: false,
      error: 'Missing environment variables',
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ? 'SET' : 'MISSING',
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ? 'SET' : 'MISSING',
      LIVEKIT_URL: process.env.LIVEKIT_URL || 'MISSING'
    });
  }
  
  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: 'test-user-123',
        name: 'Test User'
      }
    );
    
    at.addGrant({
      room: 'test-room',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true
    });
    
    // CRITICAL: AWAIT the toJwt()
    let token = await at.toJwt();  // ← ADDED await here!
    
    console.log('Test token type:', typeof token);
    
    // Handle non-string
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
    
    const parts = token.split('.');
    
    res.json({
      success: true,
      message: 'Token generation test successful',
      tokenType: typeof token,
      tokenLength: token.length,
      isString: typeof token === 'string',
      tokenPreview: token.substring(0, 100) + '...',
      jwtParts: parts.length,
      jwtValid: parts.length === 3,
      config: {
        LIVEKIT_URL: process.env.LIVEKIT_URL,
        apiKeyConfigured: !!process.env.LIVEKIT_API_KEY,
        apiSecretConfigured: !!process.env.LIVEKIT_API_SECRET
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;

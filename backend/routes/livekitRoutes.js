const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
const router = express.Router();

router.post('/token', (req, res) => {
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
    return res.status(500).json({ error: 'Server configuration error - missing LiveKit credentials' });
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
    // CRITICAL: Generate JWT TOKEN STRING
    // ========================================
    const token = at.toJwt();
    
    // ========================================
    // VALIDATION: Ensure token is a string
    // ========================================
    if (typeof token !== 'string') {
      console.error('❌ CRITICAL ERROR: toJwt() did not return a string!');
      console.error('Token type:', typeof token);
      console.error('Token value:', token);
      return res.status(500).json({ 
        error: 'Token generation failed - invalid token type',
        type: typeof token
      });
    }
    
    // Validate JWT structure (should have 3 parts)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ CRITICAL ERROR: Invalid JWT structure!');
      console.error('JWT parts:', tokenParts.length, '(expected 3)');
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
    
    // ========================================
    // RESPONSE: Return token as STRING
    // ========================================
    const response = {
      token: token,  // This MUST be a string
      url: process.env.LIVEKIT_URL
    };
    
    // Final validation before sending
    if (typeof response.token !== 'string') {
      console.error('❌ CRITICAL: Response token is not a string!');
      console.error('Response:', response);
      return res.status(500).json({ error: 'Invalid response format' });
    }
    
    console.log('✅ Sending response:');
    console.log('   token type:', typeof response.token);
    console.log('   url:', response.url);
    console.log('===========================================\n');
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error generating LiveKit token:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate token', 
      details: error.message 
    });
  }
});

// ========================================
// TEST ENDPOINT (for debugging)
// ========================================
router.get('/test', (req, res) => {
  console.log('\n========== LIVEKIT TEST REQUEST ==========');
  
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return res.json({
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
    
    const token = at.toJwt();
    
    res.json({
      success: true,
      message: 'Token generation test successful',
      tokenType: typeof token,
      tokenLength: token.length,
      isString: typeof token === 'string',
      tokenPreview: token.substring(0, 100) + '...',
      jwtParts: token.split('.').length,
      config: {
        LIVEKIT_URL: process.env.LIVEKIT_URL,
        apiKeyConfigured: !!process.env.LIVEKIT_API_KEY,
        apiSecretConfigured: !!process.env.LIVEKIT_API_SECRET
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;

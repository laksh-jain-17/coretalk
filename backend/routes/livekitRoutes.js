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
    return res.status(500).json({ 
      error: 'Server configuration error - missing LiveKit credentials',
      details: {
        hasApiKey: !!process.env.LIVEKIT_API_KEY,
        hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
        hasUrl: !!process.env.LIVEKIT_URL
      }
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
    // CRITICAL FIX: Generate JWT TOKEN STRING
    // ========================================
    let token = at.toJwt();
    
    console.log('Raw token from toJwt():', typeof token, token);
    
    // CRITICAL: Handle case where toJwt() returns an object
    if (typeof token === 'object' && token !== null) {
      console.log('⚠️  Token is an object, attempting to extract string...');
      console.log('Token object keys:', Object.keys(token));
      
      // Try common property names
      if (token.token) {
        token = token.token;
      } else if (token.jwt) {
        token = token.jwt;
      } else if (token.value) {
        token = token.value;
      } else if (token.toString && typeof token.toString === 'function') {
        token = token.toString();
      } else {
        console.error('❌ Cannot extract string from token object:', token);
        return res.status(500).json({ 
          error: 'Token generation failed - object returned',
          tokenType: typeof token,
          tokenKeys: Object.keys(token)
        });
      }
      
      console.log('Extracted token:', typeof token, token);
    }
    
    // Force convert to string if needed
    if (typeof token !== 'string') {
      console.log('⚠️  Converting token to string...');
      token = String(token);
    }
    
    // Final validation
    if (typeof token !== 'string') {
      console.error('❌ CRITICAL ERROR: Token is still not a string!');
      console.error('Token type:', typeof token);
      console.error('Token value:', token);
      return res.status(500).json({ 
        error: 'Token generation failed - invalid token type',
        type: typeof token
      });
    }
    
    // Check for [object Object] string
    if (token === '[object Object]') {
      console.error('❌ CRITICAL ERROR: Token is "[object Object]" string!');
      return res.status(500).json({ 
        error: 'Token generation failed - object serialization error'
      });
    }
    
    // Validate JWT structure (should have 3 parts)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ CRITICAL ERROR: Invalid JWT structure!');
      console.error('JWT parts:', tokenParts.length, '(expected 3)');
      console.error('Token:', token.substring(0, 100));
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
      token: token,
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
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate token', 
      details: error.message,
      name: error.name
    });
  }
});

// ========================================
// TEST ENDPOINT (for debugging)
// ========================================
router.get('/test', (req, res) => {
  console.log('\n========== LIVEKIT TEST REQUEST ==========');
  
  // Check environment variables
  const hasApiKey = !!process.env.LIVEKIT_API_KEY;
  const hasApiSecret = !!process.env.LIVEKIT_API_SECRET;
  const hasUrl = !!process.env.LIVEKIT_URL;
  
  if (!hasApiKey || !hasApiSecret || !hasUrl) {
    return res.json({
      success: false,
      error: 'Missing environment variables',
      config: {
        LIVEKIT_API_KEY: hasApiKey ? 'SET' : 'MISSING',
        LIVEKIT_API_SECRET: hasApiSecret ? 'SET' : 'MISSING',
        LIVEKIT_URL: process.env.LIVEKIT_URL || 'MISSING'
      }
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
    
    let token = at.toJwt();
    
    console.log('Test token type:', typeof token);
    console.log('Test token value:', token);
    
    // Handle object return
    if (typeof token === 'object' && token !== null) {
      const originalToken = token;
      if (token.token) token = token.token;
      else if (token.jwt) token = token.jwt;
      else if (token.value) token = token.value;
      else token = String(token);
      
      return res.json({
        success: false,
        error: 'toJwt() returned an object instead of string',
        originalType: typeof originalToken,
        originalKeys: Object.keys(originalToken),
        extractedToken: token,
        extractedType: typeof token,
        extractedLength: typeof token === 'string' ? token.length : 'N/A',
        suggestion: 'Update livekit-server-sdk: npm install livekit-server-sdk@latest'
      });
    }
    
    // Force to string if needed
    if (typeof token !== 'string') {
      token = String(token);
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
        apiKeyConfigured: hasApiKey,
        apiSecretConfigured: hasApiSecret
      }
    });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }
});

module.exports = router;

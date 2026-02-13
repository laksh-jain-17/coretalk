// ========================================
// DIAGNOSTIC SCRIPT FOR LIVEKIT TOKEN
// ========================================
// Run this in your backend directory: node diagnostic.js

require('dotenv').config();
const { AccessToken } = require('livekit-server-sdk');

console.log('\n========================================');
console.log('LIVEKIT DIAGNOSTIC SCRIPT');
console.log('========================================\n');

// Step 1: Check environment variables
console.log('Step 1: Environment Variables');
console.log('-----------------------------');
console.log('LIVEKIT_API_KEY:', process.env.LIVEKIT_API_KEY ? '✅ SET (' + process.env.LIVEKIT_API_KEY.substring(0, 10) + '...)' : '❌ MISSING');
console.log('LIVEKIT_API_SECRET:', process.env.LIVEKIT_API_SECRET ? '✅ SET (' + process.env.LIVEKIT_API_SECRET.substring(0, 10) + '...)' : '❌ MISSING');
console.log('LIVEKIT_URL:', process.env.LIVEKIT_URL || '❌ MISSING');

if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
  console.log('\n❌ CRITICAL: Missing environment variables!');
  console.log('Create a .env file with:');
  console.log('LIVEKIT_API_KEY=your_key');
  console.log('LIVEKIT_API_SECRET=your_secret');
  console.log('LIVEKIT_URL=wss://coretalk-e6xkfd5h.livekit.cloud');
  process.exit(1);
}

console.log('\n✅ All environment variables present\n');

// Step 2: Check livekit-server-sdk version
console.log('Step 2: Package Version');
console.log('----------------------');
try {
  const pkg = require('./package.json');
  console.log('livekit-server-sdk version:', pkg.dependencies['livekit-server-sdk']);
} catch (e) {
  console.log('Could not read package.json');
}

// Step 3: Test token generation
console.log('\nStep 3: Token Generation Test');
console.log('-----------------------------');

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
  
  console.log('Token generation: ✅ SUCCESS');
  console.log('Token type:', typeof token);
  console.log('Token is string:', typeof token === 'string');
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 100) + '...');
  
  // Validate JWT structure
  const parts = token.split('.');
  console.log('JWT structure:', parts.length === 3 ? '✅ VALID (3 parts)' : '❌ INVALID (' + parts.length + ' parts)');
  
  if (typeof token !== 'string') {
    console.log('\n❌ CRITICAL ERROR: Token is not a string!');
    console.log('This is the bug causing your issue.');
    console.log('Try updating livekit-server-sdk:');
    console.log('npm install livekit-server-sdk@latest --save');
  } else if (parts.length !== 3) {
    console.log('\n❌ CRITICAL ERROR: Invalid JWT structure!');
    console.log('Token does not have 3 parts separated by dots.');
  } else {
    console.log('\n✅ ✅ ✅ TOKEN GENERATION WORKING PERFECTLY! ✅ ✅ ✅');
    console.log('\nYour backend should work correctly.');
    console.log('If you still get errors in the frontend:');
    console.log('1. Restart your backend server');
    console.log('2. Clear browser cache');
    console.log('3. Check frontend console logs');
  }
  
} catch (error) {
  console.log('❌ Token generation FAILED');
  console.log('Error:', error.message);
  console.log('Stack:', error.stack);
  console.log('\nPossible causes:');
  console.log('1. Invalid API key or secret');
  console.log('2. Outdated livekit-server-sdk version');
  console.log('3. Network/dependency issues');
}

console.log('\n========================================');
console.log('DIAGNOSTIC COMPLETE');
console.log('========================================\n');

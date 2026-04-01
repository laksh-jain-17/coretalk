const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const livekitRoutes = require('./routes/livekitRoutes');
require('dotenv').config();

const app = express();
const helmet = require('helmet');
const authMiddleware = require('./middleware/authMiddleware');
const Room = require('./models/Room');

// ── Rate limiting ────────────────────────────────────────────────────────────
// npm install express-rate-limit
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 login attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many login attempts. Please try again in 15 minutes.' }
});

// ── Helmet ───────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// ✅ FIX #3: removed wildcard *.vercel.app — only your specific origins allowed
const allowedOrigins = [
  'http://localhost:5173',
  'https://coretalk.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

app.options('*', cors());

// ✅ FIX #5: limit request body size to prevent oversized payload attacks
app.use(express.json({ limit: '10kb' }));

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');

// ✅ FIX #4: apply rate limiter specifically to login endpoint
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes'));

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.use('/api/livekit', livekitRoutes);

// ── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err.message));

// ── HTTP Server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ── Socket.io ────────────────────────────────────────────────────────────────
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// In-memory room state
const rooms = {};

adminRoutes.setGetRooms(() => rooms);

// ✅ FIX #2: helper to verify host via DB instead of trusting the client's isHost flag
async function verifyIsHost(userId, roomId) {
  const room = await Room.findOne({ roomId });
  if (!room) return false;
  return room.host.toString() === userId;
}

io.on('connection', (socket) => {
  console.log("New socket connected:", socket.id);
  let joinedRoom = null;
  let socketUserId = null;

  // ✅ FIX #2: isHost from client is IGNORED — we verify against DB
  socket.on('join-room', async ({ roomId, userName, userId }) => {
    if (!roomId || !userId) return;

    joinedRoom = roomId;
    socketUserId = userId;

    // Check DB to determine if this user is actually the host
    const isHost = await verifyIsHost(userId, roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    const existingIndex = rooms[roomId].findIndex(p => p.id === socket.id || p.userId === userId);

    const userData = {
      id: socket.id,
      userId: userId,
      name: userName || 'Anonymous',
      isHost,             // set from DB, not from client
      joinedAt: new Date()
    };

    if (existingIndex >= 0) {
      rooms[roomId][existingIndex] = userData;
    } else {
      rooms[roomId].push(userData);
    }

    socket.join(roomId);
    io.to(roomId).emit('participants-list', rooms[roomId]);
    const existingUsers = rooms[roomId].filter(p => p.id !== socket.id);
    socket.emit('existing-users', existingUsers);
    socket.to(roomId).emit('user-joined', userData);
  });

  socket.on('signal', ({ to, signal }) => {
    if (to && signal) {
      io.to(to).emit('signal', { from: socket.id, signal });
    }
  });

  socket.on('chat-message', ({ roomId, sender, text, timestamp }) => {
    if (joinedRoom && text) {
      io.to(roomId).emit('chat-message', {
        sender: sender || 'Unknown',
        text: text,
        timestamp: timestamp || Date.now()
      });
    }
  });

  socket.on('hand-raised', ({ roomId, userId, userName, isRaised }) => {
    if (roomId) {
      io.to(roomId).emit('hand-raised', { roomId, userId, userName, isRaised });
    }
  });

  socket.on('video-status', ({ roomId, userId, userName, isVideoOn }) => {
    if (roomId) {
      io.to(roomId).emit('video-status', { userId, userName, isVideoOn });
    }
  });

  socket.on('mic-status', ({ roomId, userId, userName, isMicOn }) => {
    if (roomId) {
      io.to(roomId).emit('mic-status', { userId, userName, isMicOn });
    }
  });

  socket.on('screen-share-status', (data) => {
    if (!data || !data.roomId) return;
    io.to(data.roomId).emit('screen-share-status', {
      userId: data.userId,
      userName: data.userName,
      isScreenSharing: data.isScreenSharing
    });
  });

  // ✅ FIX #2: verify host in DB before performing host socket actions
  socket.on('mute-all', async ({ roomId }) => {
    if (!roomId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return; // silently reject — don't tell attacker why
    io.to(roomId).emit('all-muted');
  });

  socket.on('lock-meeting', async ({ roomId, locked }) => {
    if (!roomId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;
    io.to(roomId).emit('meeting-locked', { locked: !!locked });
  });

  socket.on('end-meeting', async ({ roomId }) => {
    if (!roomId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;
    io.to(roomId).emit('meeting-ended');
    if (rooms[roomId]) delete rooms[roomId];
  });

  socket.on('disconnect', (reason) => {
    if (joinedRoom && rooms[joinedRoom]) {
      rooms[joinedRoom] = rooms[joinedRoom].filter(p => p.id !== socket.id);
      if (rooms[joinedRoom].length === 0) {
        delete rooms[joinedRoom];
      } else {
        io.to(joinedRoom).emit('participants-list', rooms[joinedRoom]);
        socket.to(joinedRoom).emit('user-left', socket.id);
      }
    }
  });
});

// ── REST API HOST CONTROLS ────────────────────────────────────────────────────
// ✅ FIX #1: all three endpoints now require auth + DB host verification

app.post('/api/end-meeting', authMiddleware, async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied. You are not the host.' });

  if (rooms[roomId]) {
    io.to(roomId).emit('meeting-ended');
    delete rooms[roomId];
  }
  res.json({ success: true, message: 'Meeting ended' });
});

app.post('/api/mute-all', authMiddleware, async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied. You are not the host.' });

  if (rooms[roomId]) io.to(roomId).emit('all-muted');
  res.json({ success: true, message: 'All participants muted' });
});

app.post('/api/lock-meeting', authMiddleware, async (req, res) => {
  const { roomId, locked } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied. You are not the host.' });

  if (rooms[roomId]) io.to(roomId).emit('meeting-locked', { locked: !!locked });
  res.json({ success: true, message: 'Meeting lock state updated' });
});

// Debug endpoint — admin only
app.get('/api/rooms', authMiddleware, (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ msg: 'Access denied. Admins only.' });
  }
  const roomSummary = {};
  for (const [roomId, participants] of Object.entries(rooms)) {
    roomSummary[roomId] = {
      participantCount: participants.length,
      participants: participants.map(p => ({ name: p.name, id: p.id, isHost: p.isHost }))
    };
  }
  res.json(roomSummary);
});

app.post('/api/send-email', async (req, res) => {
  const { accessToken, to, subject, body, senderEmail } = req.body;
  if (!accessToken || !to || !subject || !body) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  try {
    const emailLines = [`To: ${to}`, `From: ${senderEmail}`, `Subject: ${subject}`, '', body];
    const raw = Buffer.from(emailLines.join('\n'))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gmail API error');
    }
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

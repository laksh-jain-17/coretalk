const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const livekitRoutes = require('./routes/livekitRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const Room = require('./models/Room');

require('dotenv').config();

const app = express();

// ── Helmet ───────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'https://coretalk.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

app.options('*', cors());

// ── Body & Cookie Parsers ────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser()); // ✅ required for httpOnly cookie reading

// ── Rate Limiting ────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many login attempts. Please try again in 15 minutes.' }
});

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/admin', adminRoutes);
app.use('/api/livekit', livekitRoutes);

app.get('/', (req, res) => {
  res.send('Backend is running');
});

// ── REST API HOST CONTROLS ───────────────────────────────────────────────────
async function verifyIsHost(userId, roomId) {
  const room = await Room.findOne({ roomId });
  if (!room) return false;
  return room.host.toString() === userId;
}

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

// ── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err.message));

// ── HTTP Server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// In-memory room state
const rooms = {};

adminRoutes.setGetRooms(() => rooms);

io.on('connection', (socket) => {
  let joinedRoom = null;
  let socketUserId = null;

  socket.on('join-room', async ({ roomId, userName, userId }) => {
    if (!roomId || !userId) return;

    joinedRoom = roomId;
    socketUserId = userId;

    const isHost = await verifyIsHost(userId, roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    const existingIndex = rooms[roomId].findIndex(p => p.id === socket.id || p.userId === userId);

    const userData = {
      id: socket.id,
      userId,
      name: userName || 'Anonymous',
      isHost,
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
    if (!joinedRoom || !text || typeof text !== 'string' || text.length > 2000) return;
    io.to(roomId).emit('chat-message', {
      sender: sender || 'Unknown',
      text,
      timestamp: timestamp || Date.now()
    });
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

  socket.on('mute-all', async ({ roomId }) => {
    if (!roomId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;
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

  socket.on('disconnect', () => {
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

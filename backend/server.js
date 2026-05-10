const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const livekitRoutes = require('./routes/livekitRoutes');
require('dotenv').config();

const app = express();
const helmet = require('helmet');
const authMiddleware = require('./middleware/authMiddleware');
const Room = require('./models/Room');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many login attempts. Please try again in 15 minutes.' }
});

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
  })
);

app.set('trust proxy', 1);

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
app.use(express.json({ limit: '10kb' }));

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes'));

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => res.send('Backend is running'));

app.use('/api/livekit', livekitRoutes);

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err.message));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const rooms = {};
adminRoutes.setGetRooms(() => rooms);

const waitingRoom = {};

async function verifyIsHost(userId, roomId) {
  const room = await Room.findOne({ roomId });
  if (!room) return false;
  return room.host.toString() === userId;
}

io.on('connection', (socket) => {
  console.log("New socket connected:", socket.id);
  let joinedRoom = null;
  let socketUserId = null;

  socket.on('join-room', async ({ roomId, userName, userId }) => {
    if (!roomId || !userId) return;

    joinedRoom = roomId;
    socketUserId = userId;

    const isHost = await verifyIsHost(userId, roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    const existingIndex = rooms[roomId].findIndex(
      p => p.id === socket.id || p.userId === userId
    );

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

    if (isHost && waitingRoom[roomId] && waitingRoom[roomId].length > 0) {
      waitingRoom[roomId].forEach(wp => {
        socket.emit('participant-waiting', {
          socketId: wp.socketId,
          userId: wp.userId,
          userName: wp.userName
        });
      });
    }
  });

  socket.on('participant-waiting', ({ roomId, userId, userName }) => {
    if (!roomId || !userId) return;

    socket.waitingRoomId = roomId;
    socket.waitingUserId = userId;
    socket.waitingUserName = userName;

    if (!waitingRoom[roomId]) waitingRoom[roomId] = [];
    const alreadyWaiting = waitingRoom[roomId].find(w => w.socketId === socket.id);
    if (!alreadyWaiting) {
      waitingRoom[roomId].push({ socketId: socket.id, userId, userName });
    }

    const hostEntry = rooms[roomId]?.find(p => p.isHost);
    if (hostEntry) {
      io.to(hostEntry.id).emit('participant-waiting', {
        socketId: socket.id,
        userId,
        userName
      });
    }
  });

  socket.on('admit-participant', async ({ socketId, roomId }) => {
    if (!socketId || !roomId) return;

    const hostEntry = rooms[roomId]?.find(p => p.id === socket.id && p.isHost);
    if (!hostEntry) {
      if (socketUserId) {
        const isHost = await verifyIsHost(socketUserId, roomId);
        if (!isHost) return;
      } else {
        return;
      }
    }

    if (waitingRoom[roomId]) {
      waitingRoom[roomId] = waitingRoom[roomId].filter(w => w.socketId !== socketId);
    }

    io.to(socketId).emit('admission-result', { admitted: true });
    console.log('Admitted socket:', socketId);
  });

  socket.on('deny-participant', async ({ socketId, roomId }) => {
    if (!socketId || !roomId || !socketUserId) return;

    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;

    if (waitingRoom[roomId]) {
      waitingRoom[roomId] = waitingRoom[roomId].filter(w => w.socketId !== socketId);
    }

    io.to(socketId).emit('admission-result', { admitted: false });
  });

  socket.on('signal', ({ to, signal }) => {
    if (!to || !signal || !joinedRoom) return;

    const targetInRoom = rooms[joinedRoom]?.find(p => p.id === to);
    if (!targetInRoom) return;

    io.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('chat-message', ({ roomId, sender, text, timestamp, attachments }) => {
    if (!joinedRoom) return;
    const safeText = typeof text === 'string' ? text.slice(0, 2000) : '';
    const safeSender = typeof sender === 'string' ? sender.slice(0, 60) : 'Unknown';
    const safeAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 5).map(a => ({
          name:     typeof a.name     === 'string' ? a.name.slice(0, 200)     : '',
          mimeType: typeof a.mimeType === 'string' ? a.mimeType.slice(0, 100) : '',
          base64:   typeof a.base64   === 'string' && a.base64.length < 2_800_000 ? a.base64 : '',
          size:     typeof a.size     === 'number' ? a.size : 0,
        }))
      : [];

    if (!safeText && safeAttachments.length === 0) return;

    io.to(roomId).emit('chat-message', {
      sender: safeSender,
      text: safeText,
      timestamp: timestamp || Date.now(),
      attachments: safeAttachments
    });
  });

  socket.on('hand-raised', ({ roomId, userId, userName, isRaised }) => {
    if (roomId) io.to(roomId).emit('hand-raised', { roomId, userId, userName, isRaised });
  });

  socket.on('video-status', ({ roomId, userId, userName, isVideoOn }) => {
    if (roomId) io.to(roomId).emit('video-status', { userId, userName, isVideoOn });
  });

  socket.on('mic-status', ({ roomId, userId, userName, isMicOn }) => {
    if (roomId) io.to(roomId).emit('mic-status', { userId, userName, isMicOn });
  });

  socket.on('screen-share-status', (data) => {
    if (!data || !data.roomId) return;
    io.to(data.roomId).emit('screen-share-status', {
      userId: data.userId,
      userName: data.userName,
      isScreenSharing: data.isScreenSharing
    });
  });

  socket.on('wb:stroke', (data) => {
    if (!data || !data.roomId) return;
    const senderInRoom = rooms[data.roomId]?.find(p => p.id === socket.id);
    if (!senderInRoom) return;
    socket.to(data.roomId).emit('wb:stroke', data);
  });

  socket.on('wb:clear', ({ roomId }) => {
    if (!roomId) return;
    const senderInRoom = rooms[roomId]?.find(p => p.id === socket.id);
    if (!senderInRoom) return;
    socket.to(roomId).emit('wb:clear');
  });

  socket.on('wb:request-state', (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit('wb:request-state', data);
  });

  socket.on('wb:state', (data) => {
    if (!data || !data.roomId) return;
    socket.to(data.roomId).emit('wb:state', data);
  });

  // Doc Enact relay — used as reliable fallback alongside LiveKit data channel.
  // Relays doc-state, doc-update, doc-access-changed, doc-request-state to the room.
  socket.on('doc-relay', (data) => {
    if (!data || !data.roomId || !data.type) return;
    const senderInRoom = rooms[data.roomId]?.find(p => p.id === socket.id);
    if (!senderInRoom) return;

    const { type, roomId, ...payload } = data;

    if (type === 'doc-enact-visibility') {
      socket.to(roomId).emit('doc-enact-visibility', payload);
      return;
    }

    if (type === 'doc-request-state') {
      socket.to(roomId).emit(type, payload);
      return;
    }

    socket.to(roomId).emit(type, payload);
  });

  socket.on('expel-participant', async ({ roomId, targetSocketId }) => {
    if (!roomId || !targetSocketId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;

    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(p => p.id !== targetSocketId);
      if (rooms[roomId].length === 0) delete rooms[roomId];
      else io.to(roomId).emit('participants-list', rooms[roomId]);
    }

    io.to(targetSocketId).emit('expelled');
    socket.to(roomId).emit('user-left', targetSocketId);
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
    if (waitingRoom[roomId]) delete waitingRoom[roomId];
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);

    if (socket.waitingRoomId) {
      const wRoomId = socket.waitingRoomId;

      if (waitingRoom[wRoomId]) {
        waitingRoom[wRoomId] = waitingRoom[wRoomId].filter(
          w => w.socketId !== socket.id
        );
        if (waitingRoom[wRoomId].length === 0) {
          delete waitingRoom[wRoomId];
        }
      }

      socket.to(wRoomId).emit('waiting-participant-left', {
        socketId: socket.id
      });
    }

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

app.post('/api/end-meeting', authMiddleware, async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied.' });

  if (rooms[roomId]) {
    io.to(roomId).emit('meeting-ended');
    delete rooms[roomId];
  }
  if (waitingRoom[roomId]) delete waitingRoom[roomId];
  res.json({ success: true, message: 'Meeting ended' });
});

app.post('/api/mute-all', authMiddleware, async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied.' });

  if (rooms[roomId]) io.to(roomId).emit('all-muted');
  res.json({ success: true, message: 'All participants muted' });
});

app.post('/api/lock-meeting', authMiddleware, async (req, res) => {
  const { roomId, locked } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied.' });

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

const { google } = require('googleapis');
app.post('/api/send-email', async (req, res) => {
  const { to, subject, body, accessToken, senderEmail } = req.body;

  if (!to || !subject || !body || !accessToken || !senderEmail) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const emailLines = [
      `To: ${to}`,
      `From: ${senderEmail}`,
      `Subject: ${subject}`,
      '',
      body
    ];

    const raw = Buffer.from(emailLines.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
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

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
// Raised from 10kb → 10mb: chat file attachments (base64) easily exceed 10kb.
app.use(express.json({ limit: '10mb' }));

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/reviews', require('./routes/reviewRoutes'));

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => res.send('Backend is running'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
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

// ─────────────────────────────────────────────────────────────────────────────
// In-memory room state — two separate structures so metadata is never lost.
//
//   rooms[roomId]     → Participant[]
//                        Reassigned by .filter() on every disconnect, so
//                        storing anything extra on this array gets silently
//                        wiped. Don't add properties to it.
//
//   roomState[roomId] → { muteLocked: boolean }
//                        A plain object that is NEVER reassigned — only its
//                        properties are mutated. Survives all .filter() calls
//                        and participant disconnects.
//                        Only deleted in end-meeting (intentional teardown),
//                        NOT on disconnect — so a host network blip doesn't
//                        lose the mute-lock state.
// ─────────────────────────────────────────────────────────────────────────────
const rooms     = {};  // { [roomId]: Participant[] }
const roomState = {};  // { [roomId]: { muteLocked: boolean } }

adminRoutes.setGetRooms(() => rooms);

const waitingRoom = {};

// Ensure roomState entry exists without overwriting existing values.
function ensureRoomState(roomId) {
  if (!roomState[roomId]) {
    roomState[roomId] = { muteLocked: false };
  }
}

async function verifyIsHost(userId, roomId) {
  const room = await Room.findOne({ roomId });
  if (!room) return false;
  return room.host.toString() === userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO
// ─────────────────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('New socket connected:', socket.id);
  let joinedRoom   = null;
  let socketUserId = null;

  // ── join-room ──────────────────────────────────────────────────────────────
  socket.on('join-room', async ({ roomId, userName, userId }) => {
    if (!roomId || !userId) return;

    joinedRoom   = roomId;
    socketUserId = userId;

    const isHost = await verifyIsHost(userId, roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    ensureRoomState(roomId);

    const existingIndex = rooms[roomId].findIndex(
      p => p.id === socket.id || p.userId === userId
    );

    const userData = {
      id:       socket.id,
      userId,
      name:     userName || 'Anonymous',
      isHost,
      joinedAt: new Date()
    };

    if (existingIndex >= 0) {
      rooms[roomId][existingIndex] = userData;
    } else {
      rooms[roomId].push(userData);
    }

    socket.join(roomId);

    // If the room is mute-locked, tell this joining participant immediately.
    // Reads from roomState (not rooms[roomId]._muteLocked) so the value
    // survives host reconnects and intermediate disconnects by other participants.
    if (roomState[roomId].muteLocked) {
      socket.emit('all-muted', { locked: true });
    }

    io.to(roomId).emit('participants-list', rooms[roomId]);
    socket.emit('existing-users', rooms[roomId].filter(p => p.id !== socket.id));
    socket.to(roomId).emit('user-joined', userData);

    // Replay pending waiting-room entries to a rejoining host.
    if (isHost && waitingRoom[roomId]?.length > 0) {
      waitingRoom[roomId].forEach(wp => {
        socket.emit('participant-waiting', {
          socketId: wp.socketId,
          userId:   wp.userId,
          userName: wp.userName
        });
      });
    }
  });

  // ── participant-waiting ────────────────────────────────────────────────────
  socket.on('participant-waiting', ({ roomId, userId, userName }) => {
    if (!roomId || !userId) return;

    socket.waitingRoomId   = roomId;
    socket.waitingUserId   = userId;
    socket.waitingUserName = userName;

    if (!waitingRoom[roomId]) waitingRoom[roomId] = [];
    if (!waitingRoom[roomId].find(w => w.socketId === socket.id)) {
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

  // ── admit-participant ──────────────────────────────────────────────────────
  socket.on('admit-participant', async ({ socketId, roomId }) => {
    if (!socketId || !roomId) return;

    const hostEntry = rooms[roomId]?.find(p => p.id === socket.id && p.isHost);
    if (!hostEntry) {
      if (!socketUserId) return;
      const isHost = await verifyIsHost(socketUserId, roomId);
      if (!isHost) return;
    }

    if (waitingRoom[roomId]) {
      waitingRoom[roomId] = waitingRoom[roomId].filter(w => w.socketId !== socketId);
    }

    io.to(socketId).emit('admission-result', { admitted: true });
    console.log('Admitted socket:', socketId);
  });

  // ── deny-participant ───────────────────────────────────────────────────────
  socket.on('deny-participant', async ({ socketId, roomId }) => {
    if (!socketId || !roomId || !socketUserId) return;

    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;

    if (waitingRoom[roomId]) {
      waitingRoom[roomId] = waitingRoom[roomId].filter(w => w.socketId !== socketId);
    }

    io.to(socketId).emit('admission-result', { admitted: false });
  });

  // ── signal ─────────────────────────────────────────────────────────────────
  socket.on('signal', ({ to, signal }) => {
    if (!to || !signal || !joinedRoom) return;
    if (!rooms[joinedRoom]?.find(p => p.id === to)) return; // target must be in same room
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  // ── chat-message ───────────────────────────────────────────────────────────
  // FIX: use joinedRoom (server-verified) for the emit, not the client-supplied
  // roomId. A malicious client could otherwise broadcast to an arbitrary room.
 /* socket.on('chat-message', ({ sender, text, timestamp, attachments }) => {
    if (!joinedRoom) return;

    const safeText    = typeof text   === 'string' ? text.slice(0, 2000) : '';
    const safeSender  = typeof sender === 'string' ? sender.slice(0, 60) : 'Unknown';
    const safeAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 5).map(a => ({
          name:     typeof a.name     === 'string' ? a.name.slice(0, 200)     : '',
          mimeType: typeof a.mimeType === 'string' ? a.mimeType.slice(0, 100) : '',
          base64:   typeof a.base64   === 'string' && a.base64.length < 2_800_000 ? a.base64 : '',
          size:     typeof a.size     === 'number' ? a.size : 0,
        }))
      : [];

    if (!safeText && safeAttachments.length === 0) return;

    io.to(joinedRoom).emit('chat-message', {
      sender:      safeSender,
      text:        safeText,
      timestamp:   timestamp || Date.now(),
      attachments: safeAttachments
    });
  }); old function*/

  socket.on('chat-message', ({ sender, text, timestamp, attachments, targetSocketId }) => {
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

  const payload = {
    sender:      safeSender,
    text:        safeText,
    timestamp:   timestamp || Date.now(),
    attachments: safeAttachments,
  };

  if (targetSocketId && targetSocketId !== 'all') {
    const targetInRoom = rooms[joinedRoom]?.find(
      p => p.id === targetSocketId || p.userId === targetSocketId
    );
    if (!targetInRoom) {
      console.log('Target not found. targetSocketId:', targetSocketId, 'room:', rooms[joinedRoom]);
      return;
    }

    payload.isPrivate = true;

    // Always use targetInRoom.id (real socket ID) for emit
    io.to(targetInRoom.id).emit('chat-message', {
      ...payload,
      privateLabel: `(private from ${safeSender})`
    });
    socket.emit('chat-message', {
      ...payload,
      privateLabel: `(private to ${targetInRoom.name})`
    });
  } else {
    io.to(joinedRoom).emit('chat-message', payload);
  }
});
  

  // ── hand-raised ────────────────────────────────────────────────────────────
  // FIX: use joinedRoom for emit, not client-supplied roomId.
  socket.on('hand-raised', ({ userId, userName, isRaised }) => {
    if (!joinedRoom) return;
    io.to(joinedRoom).emit('hand-raised', { roomId: joinedRoom, userId, userName, isRaised });
  });

  // ── video-status / mic-status / screen-share-status ───────────────────────
  socket.on('video-status', ({ userId, userName, isVideoOn }) => {
    if (joinedRoom) io.to(joinedRoom).emit('video-status', { userId, userName, isVideoOn });
  });

  socket.on('mic-status', ({ userId, userName, isMicOn }) => {
    if (joinedRoom) io.to(joinedRoom).emit('mic-status', { userId, userName, isMicOn });
  });

  socket.on('screen-share-status', (data) => {
    if (!joinedRoom || !data) return;
    io.to(joinedRoom).emit('screen-share-status', {
      userId:          data.userId,
      userName:        data.userName,
      isScreenSharing: data.isScreenSharing
    });
  });

  // ── whiteboard ─────────────────────────────────────────────────────────────
  socket.on('wb:stroke', (data) => {
    if (!data || !data.roomId) return;
    if (!rooms[data.roomId]?.find(p => p.id === socket.id)) return;
    socket.to(data.roomId).emit('wb:stroke', data);
  });

  socket.on('wb:clear', ({ roomId }) => {
    if (!roomId) return;
    if (!rooms[roomId]?.find(p => p.id === socket.id)) return;
    socket.to(roomId).emit('wb:clear');
  });

  socket.on('wb:request-state', (data) => {
    if (!data?.roomId) return;
    socket.to(data.roomId).emit('wb:request-state', data);
  });

  socket.on('wb:state', (data) => {
    if (!data?.roomId) return;
    socket.to(data.roomId).emit('wb:state', data);
  });

  // ── doc-relay ──────────────────────────────────────────────────────────────
  socket.on('doc-relay', (data) => {
    if (!data?.roomId || !data.type) return;
    if (!rooms[data.roomId]?.find(p => p.id === socket.id)) return;

    const { type, roomId, ...payload } = data;

    // doc-enact-visibility and doc-request-state have dedicated emit names;
    // all other doc types (doc-state, doc-update, doc-access-changed) pass through.
    if (type === 'doc-enact-visibility') {
      socket.to(roomId).emit('doc-enact-visibility', payload);
    } else if (type === 'doc-request-state') {
      socket.to(roomId).emit('doc-request-state', payload);
    } else {
      socket.to(roomId).emit(type, payload);
    }
  });

  // ── expel-participant ──────────────────────────────────────────────────────
  socket.on('expel-participant', async ({ roomId, targetSocketId }) => {
    if (!roomId || !targetSocketId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;

    if (!rooms[roomId]) return;

    const target = rooms[roomId].find(
      p => p.id === targetSocketId || p.userId === targetSocketId
    );
    const resolvedSocketId = target?.id || targetSocketId;

    rooms[roomId] = rooms[roomId].filter(p => p.id !== resolvedSocketId);

    if (rooms[roomId].length === 0) {
      delete rooms[roomId];
      // Do NOT delete roomState here — same reasoning as disconnect handler.
      // The host may remain connected; only end-meeting clears roomState.
    } else {
      io.to(roomId).emit('participants-list', rooms[roomId]);
    }

    io.to(resolvedSocketId).emit('expelled');
    socket.to(roomId).emit('user-left', resolvedSocketId);
  });

  // ── mute-all (socket path) ─────────────────────────────────────────────────
  // Kept as a secondary path. The frontend currently uses HTTP POST /api/mute-all,
  // but this allows future socket-only clients to work too.
  socket.on('mute-all', async ({ roomId, locked }) => {
    if (!roomId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;

    ensureRoomState(roomId);
    roomState[roomId].muteLocked = !!locked;
    io.to(roomId).emit('all-muted', { locked: !!locked });
  });

  // ── lock-meeting ───────────────────────────────────────────────────────────
  socket.on('lock-meeting', async ({ roomId, locked }) => {
    if (!roomId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;
    io.to(roomId).emit('meeting-locked', { locked: !!locked });
  });

  // ── end-meeting ────────────────────────────────────────────────────────────
  socket.on('end-meeting', async ({ roomId }) => {
    if (!roomId || !socketUserId) return;
    const isHost = await verifyIsHost(socketUserId, roomId);
    if (!isHost) return;

    io.to(roomId).emit('meeting-ended');
    delete rooms[roomId];
    delete roomState[roomId];    // intentional teardown — safe to clear here
    if (waitingRoom[roomId]) delete waitingRoom[roomId];
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);

    // Clean up waiting room entry if this socket was waiting to join.
    if (socket.waitingRoomId) {
      const wRoomId = socket.waitingRoomId;
      if (waitingRoom[wRoomId]) {
        waitingRoom[wRoomId] = waitingRoom[wRoomId].filter(w => w.socketId !== socket.id);
        if (waitingRoom[wRoomId].length === 0) delete waitingRoom[wRoomId];
      }
      socket.to(wRoomId).emit('waiting-participant-left', { socketId: socket.id });
    }

    if (joinedRoom && rooms[joinedRoom]) {
      // filter() creates a new array — safe because mute-lock lives in
      // roomState[joinedRoom], not on the array itself.
      rooms[joinedRoom] = rooms[joinedRoom].filter(p => p.id !== socket.id);

      if (rooms[joinedRoom].length === 0) {
        delete rooms[joinedRoom];
        // NOTE: roomState[joinedRoom] is intentionally NOT deleted here.
        // If the host briefly disconnects (network blip / LiveKit reconnect)
        // and then rejoins, the mute-lock state is preserved. roomState is
        // only cleared in end-meeting (socket and HTTP paths).
      } else {
        io.to(joinedRoom).emit('participants-list', rooms[joinedRoom]);
        socket.to(joinedRoom).emit('user-left', socket.id);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP routes
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/end-meeting
app.post('/api/end-meeting', authMiddleware, async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied.' });

  io.to(roomId).emit('meeting-ended');
  if (rooms[roomId])     delete rooms[roomId];
  if (roomState[roomId]) delete roomState[roomId];
  if (waitingRoom[roomId]) delete waitingRoom[roomId];

  res.json({ success: true, message: 'Meeting ended' });
});

// POST /api/mute-all
// Changes from original:
//   1. roomState used instead of rooms[roomId]._muteLocked — survives filter().
//   2. io.emit() not gated on rooms[roomId] existing — host can set the lock
//      even if the participant list is transiently empty, and new joiners
//      will be told via the join-room handler reading roomState.
//   3. Frontend no longer optimistically writes isMuteAllActive — the
//      'all-muted' socket event (received by everyone including the host)
//      is the single source of truth for the toggle state.
app.post('/api/mute-all', authMiddleware, async (req, res) => {
  const { roomId, locked } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied.' });

  ensureRoomState(roomId);
  roomState[roomId].muteLocked = !!locked;
  io.to(roomId).emit('all-muted', { locked: !!locked });

  res.json({ success: true, message: 'Mute state updated', locked: !!locked });
});

// POST /api/lock-meeting
app.post('/api/lock-meeting', authMiddleware, async (req, res) => {
  const { roomId, locked } = req.body;
  if (!roomId) return res.status(400).json({ success: false, message: 'roomId is required' });

  const isHost = await verifyIsHost(req.user.id, roomId);
  if (!isHost) return res.status(403).json({ success: false, message: 'Access denied.' });

  if (rooms[roomId]) io.to(roomId).emit('meeting-locked', { locked: !!locked });
  res.json({ success: true, message: 'Meeting lock state updated' });
});

// GET /api/rooms (admin only)
app.get('/api/rooms', authMiddleware, (req, res) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ msg: 'Access denied. Admins only.' });
  }
  const roomSummary = {};
  for (const [roomId, participants] of Object.entries(rooms)) {
    roomSummary[roomId] = {
      participantCount: participants.length,
      muteLocked:       roomState[roomId]?.muteLocked ?? false,
      participants:     participants.map(p => ({ name: p.name, id: p.id, isHost: p.isHost }))
    };
  }
  res.json(roomSummary);
});

// POST /api/send-email
// Also fixed: now handles attachments as proper MIME multipart,
// and removed the unused `google` import from googleapis.
app.post('/api/send-email', async (req, res) => {
  const { to, subject, body, accessToken, senderEmail, attachments } = req.body;

  if (!to || !subject || !body || !accessToken || !senderEmail) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    let raw;

    if (!hasAttachments) {
      // Simple plain-text email
      const emailLines = [
        `To: ${to}`,
        `From: ${senderEmail}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
      ];
      raw = Buffer.from(emailLines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } else {
      // Multipart email with file attachments
      const boundary = `boundary_${Date.now()}`;
      const lines = [
        `To: ${to}`,
        `From: ${senderEmail}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ];

      for (const att of attachments) {
        if (!att.base64 || !att.name) continue;
        lines.push(
          `--${boundary}`,
          `Content-Type: ${att.mimeType || 'application/octet-stream'}`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${att.name}"`,
          '',
          att.base64
        );
      }

      lines.push(`--${boundary}--`);
      raw = Buffer.from(lines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

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

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Review routes
app.use('/api/reviews', require('./routes/reviewRoutes'));

// Admin routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err.message));

// Start HTTP server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Socket.io setup
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory rooms with enhanced user data
const rooms = {};

// IMPORTANT: Inject rooms into admin routes for live meeting monitoring
adminRoutes.setGetRooms(() => rooms);

io.on('connection', (socket) => {
  console.log("New socket connected:", socket.id);
  let joinedRoom = null;

  socket.on('join-room', ({ roomId, userName, userId, isHost }) => {
    if (!roomId) return;

    joinedRoom = roomId;
    console.log(`User joining room: ${roomId}, Name: ${userName}, ID: ${userId}, Host: ${isHost}`);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    const existingIndex = rooms[roomId].findIndex(p => p.id === socket.id || p.userId === userId);
    
    const userData = {
      id: socket.id,
      userId: userId || socket.id,
      name: userName || 'Anonymous',
      isHost: isHost || false,
      joinedAt: new Date()
    };

    if (existingIndex >= 0) {
      rooms[roomId][existingIndex] = userData;
    } else {
      rooms[roomId].push(userData);
    }

    socket.join(roomId);
    
    // Broadcast updated participant list to everyone in the room
    io.to(roomId).emit('participants-list', rooms[roomId]);
    
    const existingUsers = rooms[roomId].filter(p => p.id !== socket.id);
    socket.emit('existing-users', existingUsers);
    
    // Notify others that a user joined (excluding sender)
    socket.to(roomId).emit('user-joined', userData);

    console.log(`Room ${roomId} participants:`, rooms[roomId].map(p => ({ name: p.name, id: p.id })));
  });

  socket.on('signal', ({ to, signal }) => {
    if (to && signal) {
      console.log(`Relaying signal from ${socket.id} to ${to}`);
      io.to(to).emit('signal', { from: socket.id, signal });
    }
  });

  socket.on('chat-message', ({ roomId, sender, text, timestamp }) => {
    if (joinedRoom && text) {
      console.log(`Chat message in room ${roomId} from ${sender}: ${text}`);
      io.to(roomId).emit('chat-message', {
        sender: sender || 'Unknown',
        text: text,
        timestamp: timestamp || Date.now()
      });
    }
  });

  // === HAND RAISED (now broadcast to entire room) ===
  socket.on('hand-raised', ({ roomId, userId, userName, isRaised }) => {
    if (roomId) {
      console.log(`${userName} ${isRaised ? 'raised' : 'lowered'} hand in room ${roomId}`);
      // Broadcast to everyone in the room (including the origin)
      io.to(roomId).emit('hand-raised', {
        roomId,
        userId,
        userName,
        isRaised
      });
    }
  });

  // === MEDIA STATUS UPDATES ===
  socket.on('video-status', ({ roomId, userId, userName, isVideoOn }) => {
    if (roomId) {
      console.log(`${userName} video status: ${isVideoOn ? 'ON' : 'OFF'} in room ${roomId}`);
      // Broadcast to everyone so UI states remain consistent
      io.to(roomId).emit('video-status', {
        userId,
        userName,
        isVideoOn
      });
    }
  });

  socket.on('mic-status', ({ roomId, userId, userName, isMicOn }) => {
    if (roomId) {
      console.log(`${userName} mic status: ${isMicOn ? 'ON' : 'OFF'} in room ${roomId}`);
      io.to(roomId).emit('mic-status', {
        userId,
        userName,
        isMicOn
      });
    }
  });

  socket.on('screen-share-status', (data) => {
    if (!data || !data.roomId) return;
    console.log('Screen share status from', data.userName, ':', data.isScreenSharing);
    // Broadcast to everyone in room to keep attendees consistent
    io.to(data.roomId).emit('screen-share-status', {
      userId: data.userId,
      userName: data.userName,
      isScreenSharing: data.isScreenSharing
    });
  });

  // Host actions (broadcast to everyone)
  socket.on('mute-all', ({ roomId }) => {
    if (roomId) {
      console.log(`Muting all participants in room ${roomId}`);
      // Broadcast to all (including host) that everyone should be muted
      io.to(roomId).emit('all-muted');
    }
  });

  socket.on('lock-meeting', ({ roomId, locked }) => {
    if (roomId) {
      console.log(`Locking meeting in room ${roomId} - locked: ${locked}`);
      // Broadcast lock state to everyone
      io.to(roomId).emit('meeting-locked', { locked: !!locked });
    }
  });

  socket.on('end-meeting', ({ roomId }) => {
    if (roomId) {
      console.log(`Ending meeting in room ${roomId}`);
      io.to(roomId).emit('meeting-ended');
      
      if (rooms[roomId]) {
        delete rooms[roomId];
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, Reason: ${reason}`);
    
    if (joinedRoom && rooms[joinedRoom]) {
      rooms[joinedRoom] = rooms[joinedRoom].filter(p => p.id !== socket.id);
      
      if (rooms[joinedRoom].length === 0) {
        delete rooms[joinedRoom];
        console.log(`Room ${joinedRoom} deleted - no participants left`);
      } else {
        // Update everyone in the room
        io.to(joinedRoom).emit('participants-list', rooms[joinedRoom]);
        // Notify others that a user left (excluding the disconnected socket)
        socket.to(joinedRoom).emit('user-left', socket.id);
        console.log(`User left room ${joinedRoom}, ${rooms[joinedRoom].length} participants remaining`);
      }
    }
  });
});

// REST API ENDPOINTS FOR HOST CONTROLS
app.post('/api/end-meeting', (req, res) => {
  const { roomId } = req.body;
  
  if (roomId && rooms[roomId]) {
    console.log(`Ending meeting via API: ${roomId}`);
    io.to(roomId).emit('meeting-ended');
    delete rooms[roomId];
    res.json({ success: true, message: 'Meeting ended' });
  } else {
    res.status(404).json({ success: false, message: 'Room not found' });
  }
});

app.post('/api/mute-all', (req, res) => {
  const { roomId } = req.body;
  
  if (roomId && rooms[roomId]) {
    console.log(`Muting all participants via API: ${roomId}`);
    io.to(roomId).emit('all-muted');
    res.json({ success: true, message: 'All participants muted' });
  } else {
    res.status(404).json({ success: false, message: 'Room not found' });
  }
});

app.post('/api/lock-meeting', (req, res) => {
  const { roomId, locked } = req.body;
  
  if (roomId && rooms[roomId]) {
    console.log(`Locking meeting via API: ${roomId} - locked: ${locked}`);
    io.to(roomId).emit('meeting-locked', { locked: !!locked });
    res.json({ success: true, message: 'Meeting locked' });
  } else {
    res.status(404).json({ success: false, message: 'Room not found' });
  }
});

// Debug endpoint to see active rooms
app.get('/api/rooms', (req, res) => {
  const roomSummary = {};
  for (const [roomId, participants] of Object.entries(rooms)) {
    roomSummary[roomId] = {
      participantCount: participants.length,
      participants: participants.map(p => ({ name: p.name, id: p.id, isHost: p.isHost }))
    };
  }
  res.json(roomSummary);
});

const Room = require('../models/Room');

async function hostOnly(req, res, next) {
  try {
    // Step 1: check token has host role
    if (!req.user || req.user.role !== 'host') {
      return res.status(403).json({ msg: 'Access denied. Host only.' });
    }

    // Step 2: check the roomid exists in the token
    const roomId = req.user.roomid;
    if (!roomId) {
      return res.status(403).json({ msg: 'Access denied. No room associated with token.' });
    }

    // Step 3: look up the room in DB and verify this user is actually its host
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ msg: 'Room not found or already ended.' });
    }

    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied. You are not the host of this room.' });
    }

    // All checks passed — attach room to request so routes can use it if needed
    req.room = room;
    next();

  } catch (err) {
    console.error('hostOnly middleware error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}

module.exports = hostOnly;

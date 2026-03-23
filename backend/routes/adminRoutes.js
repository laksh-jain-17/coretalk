const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');
const Room = require('../models/Room');
const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminOnly');

// Shorthand: all admin routes require auth + admin role
const adminGuard = [authMiddleware, adminOnly];

// ============ USERS MANAGEMENT ============
router.get('/users', adminGuard, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.delete('/users/:id', adminGuard, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============ FEEDBACK/REVIEWS ============
router.get('/feedback', adminGuard, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    const formattedReviews = reviews.map(review => ({
      _id: review._id,
      userName: review.user ? review.user.name : 'Unknown User',
      userEmail: review.user ? review.user.email : 'N/A',
      comment: review.comment,
      createdAt: review.createdAt
    }));
    
    res.json(formattedReviews);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============ USAGE METRICS ============
router.get('/usage-metrics', adminGuard, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    const monthlyStats = await Room.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalMeetings: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const usageData = monthNames.map((month, index) => {
      const monthData = monthlyStats.find(stat => stat._id === index + 1);
      return {
        month: month,
        totalMeetings: monthData ? monthData.totalMeetings : 0
      };
    });

    res.json(usageData);
  } catch (err) {
    console.error('Error fetching usage metrics:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============ ACTIVE MEETINGS ============
let getRoomsFunction = null;

router.setGetRooms = (fn) => {
  getRoomsFunction = fn;
};

router.get('/active-meetings', adminGuard, (req, res) => {
  try {
    if (!getRoomsFunction) {
      return res.json([]);
    }

    const rooms = getRoomsFunction();
    
    const activeMeetings = Object.entries(rooms).map(([roomId, participants]) => {
      const host = participants.find(p => p.isHost);
      return {
        _id: roomId,
        roomId: roomId,
        host: host ? host.name : 'Unknown',
        participantCount: participants.length,
        participants: participants.map(p => p.name),
        startTime: participants[0]?.joinedAt || new Date()
      };
    });

    res.json(activeMeetings);
  } catch (err) {
    console.error('Error fetching active meetings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;

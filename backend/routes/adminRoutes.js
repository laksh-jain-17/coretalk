const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');
const Room = require('../models/Room');
const authMiddleware = require('../middleware/authMiddleware');

// ============ USERS MANAGEMENT ============
// Get all users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password'); // hide passwords
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ============ FEEDBACK/REVIEWS ============
// Get all reviews with user details

// Add this route in adminRoutes.js
router.get('/feedback', authMiddleware, async (req, res) => {
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
// Get monthly usage statistics
router.get('/usage-metrics', authMiddleware, async (req, res) => {
  try {
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Aggregate meetings by month
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
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create array for all 12 months (fill missing months with 0)
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

// ============ ACTIVE MEETINGS (from Socket.io rooms) ============
// Note: This will be injected from server.js
// We'll create a getter function that server.js can use
let getRoomsFunction = null;

router.setGetRooms = (fn) => {
  getRoomsFunction = fn;
};

router.get('/active-meetings', authMiddleware, (req, res) => {
  try {
    if (!getRoomsFunction) {
      return res.json([]); // Return empty array if no rooms available
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
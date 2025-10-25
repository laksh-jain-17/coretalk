const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try{
    const { name, email, password } = req.body; 
    const existingUser = await User.findOne({ email });
    if(existingUser) 
    {
      return res.status(400).json({ msg: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });
    await newUser.save();
    return res.status(201).json({ msg: 'User details saved successfully' });
  } 
  catch(err)
  {
    console.error("Registration error", err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

/*exports.login = async (req, res) => {
  try{
    const { email, password } = req.body;
    console.log("Login attempt:", req.body);
    const user = await User.findOne({ email });
    if(!user) 
    {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const matchPassword = await bcrypt.compare(password, user.password);
    if(!matchPassword) 
    {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,   
        email: user.email   
      }
    });
  }
  catch(err)
  {
    console.error("Login error:", err);
    return res.status(500).json({ msg: 'Server error' });
  }
};*/

// Backend: authController.js - Update login function
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if(!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    
    const matchPassword = await bcrypt.compare(password, user.password);
    if(!matchPassword) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check if user is admin (add isAdmin field to User model)
    const isAdmin = user.isAdmin || false;
    
    const token = jwt.sign(
      { id: user._id, isAdmin: isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: isAdmin  // Send from backend
      }
    });
  } catch(err) {
    console.error("Login error:", err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

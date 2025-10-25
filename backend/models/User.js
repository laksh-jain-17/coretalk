const mongoose = require('mongoose');

/*const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }
}, {
    timestamps: true // This adds createdAt and updatedAt automatically
});*/

// Add to User.js model
/*const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }  // Add this
}, {
    timestamps: true
});*/

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    googleId: { type: String, unique: true, sparse: true }  // Add this line
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
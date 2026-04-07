const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    isAdmin:  { type: Boolean, default: false },
    googleId: { type: String, unique: true, sparse: true },

    // ✅ OTP-based password reset
    resetOtp:       { type: String, default: null }, // stores hashed OTP — never raw
    resetOtpExpiry: { type: Date,   default: null },
    passwordChangedAt: { type: Date, default: null },
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);

const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["forgot-password", "registration"],
        default: "forgot-password"
    },
    registrationData: {
        name: { type: String },
        password: { type: String } // ALWAYS bcrypt hashed
    },
    verified: {
        type: Boolean,
        default: false
    },
    lastSentAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600
    }
});

module.exports = mongoose.model("OTP", otpSchema);

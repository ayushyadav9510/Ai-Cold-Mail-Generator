const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true, // Fixed spelling
        unique: true
    },
    password: {
        type: String,
        required: true, // Fixed spelling
        minlength: 6,   // Fixed spelling (minlength)
        select: false
    },
    username: {
        type: String,
        required: true  // Fixed spelling
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        select: false
    },
    otpExpiry: {
        type: Date  
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password for login
// Fixed: userSchema.method ko userSchema.methods kiya
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}

const User = mongoose.model('User', userSchema);
module.exports = User;

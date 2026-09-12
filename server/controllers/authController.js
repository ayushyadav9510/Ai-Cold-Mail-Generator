const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const generateAuthToken = function(id) {
    const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '24h'});
    return token;
}

exports.registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });   
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use" });
        }

        // ✨ FIXED: Ab koi OTP nahi banega. User direct register hote hi 'isVerified: true' ho jayega
        const user = await User.create({ 
            username, 
            email: email.trim().toLowerCase(), 
            password, 
            isVerified: true // Direct bypass activation
        });

        // ✨ FIXED: Register hote hi hum instant Auth Token generate kar rahe hain
        const token = generateAuthToken(user._id);
        console.log(`✅ User ${email} registered successfully and logged in automatically!`);

        // Frontend ko direct login token aur user object bhej rahe hain
        return res.status(201).json({
            message: "Registration successful! Welcome to Dashboard.", 
            token,
            user: { username: user.username, email: user.email }
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Error registering user", error: error.message });
    }
}


exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }
        const user = await User.findOne({ email }).select('+otp +otpExpiry');
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }
        user.isVerified = true;
        await user.save();
        const token = generateAuthToken(user._id);
        return res.status(200).json({ token, message: 'OTP verified successfully' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error verifying OTP', error: error.message });
    }
}

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Debugging log: Terminal me check karne ke liye data kya aa raha hai
        console.log("➡️ LOGIN REQUEST RECEIVED FOR EMAIL:", email);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // 1. User ko dhoondna aur explicit flags select karna
        const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password +isVerified');
        
        if (!user) {
            console.log("❌ LOGIN FAIL: User not found in database for email:", email);
            return res.status(400).json({ message: 'User not found. Please register first.' });
        }

        // 2. Temporarily checking password bypass format for testing
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log("❌ LOGIN FAIL: Password did not match for user:", email);
            return res.status(400).json({ message: 'Invalid credentials. Password incorrect.' });
        }

        // 3. Token banana aur user object return karna
        const token = generateAuthToken(user._id);
        console.log("✅ LOGIN SUCCESSFUL FOR:", email);

        return res.status(200).json({ 
            message: 'Login successful', 
            token, 
            user: { username: user.username, email: user.email } 
        });
    }
    catch (error) {
        console.error("❌ LOGIN MAIN SYSTEM ERROR:", error);
        return res.status(500).json({ message: 'Error logging in', error: error.message });
    }
}


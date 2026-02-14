const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// @route   POST api/auth/signup
// @desc    Register new user (sends OTP for email verification)
// @access  Public
router.post('/signup', async (req, res) => {
    let { name, email, password } = req.body;
    email = email.toLowerCase();

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Generate 6-digit OTP for email verification
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user = new User({
            name,
            email,
            password,
            otp,
            otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
            isVerified: false
        });

        await user.save();

        // Log OTP to console (replace with real email service in production)
        console.log(`---------------------------------------------------`);
        console.log(`EMAIL VERIFICATION FOR: ${email}`);
        console.log(`YOUR OTP IS: ${otp}`);
        console.log(`---------------------------------------------------`);

        res.json({ msg: 'OTP sent to email', email });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/verify
// @desc    Verify signup OTP and log user in
// @access  Public
router.post('/verify', async (req, res) => {
    let { email, otp } = req.body;
    email = email.toLowerCase();

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid email' });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        // Mark as verified
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase();

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid email' });
        }

        if (!user.isVerified) {
            return res.status(400).json({ msg: 'Please verify your email first' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid password' });
        }

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/forgot-password
// @desc    Send OTP for password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
    let { email } = req.body;
    email = email.toLowerCase();

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'No account found with that email' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        console.log(`---------------------------------------------------`);
        console.log(`PASSWORD RESET OTP FOR: ${email}`);
        console.log(`YOUR OTP IS: ${otp}`);
        console.log(`---------------------------------------------------`);

        res.json({ msg: 'OTP sent to your email' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/reset-password
// @desc    Verify OTP and reset password
// @access  Public
router.post('/reset-password', async (req, res) => {
    let { email, otp, newPassword } = req.body;
    email = email.toLowerCase();

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid email' });
        }

        if (user.resetOtp !== otp || user.resetOtpExpires < Date.now()) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        user.password = newPassword;
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        await user.save();

        res.json({ msg: 'Password reset successful. You can now log in.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/google
// @desc    Authenticate via Google OAuth
// @access  Public
router.post('/google', async (req, res) => {
    const { credential } = req.body;

    try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        // Find or create user
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Create new user with a random password (won't be used for Google login)
            const randomPass = require('crypto').randomBytes(32).toString('hex');
            user = new User({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                password: randomPass,
                isVerified: true, // Google already verified the email
            });
            await user.save();
        } else if (!user.isVerified) {
            // If user exists but unverified, mark as verified (Google confirms email)
            user.isVerified = true;
            await user.save();
        }

        const jwtPayload = { user: { id: user.id } };

        jwt.sign(
            jwtPayload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error('Google auth error:', err.message);
        res.status(401).json({ msg: 'Google authentication failed' });
    }
});

// @route   POST api/auth/apple
// @desc    Authenticate via Apple Sign-In
// @access  Public
const appleSignin = require('apple-signin-auth');
router.post('/apple', async (req, res) => {
    const { id_token, code, user: appleUser } = req.body;

    try {
        const { email, sub: appleId } = await appleSignin.verifyIdToken(id_token, {
            audience: process.env.APPLE_CLIENT_ID,
            ignoreExpiration: false, // Ensure token is valid
        });

        // Find or create user
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Apple only provides the name on the first sign-in
            let name = appleId;
            if (appleUser && appleUser.name) {
                name = `${appleUser.name.firstName} ${appleUser.name.lastName}`.trim();
            }

            const randomPass = require('crypto').randomBytes(32).toString('hex');
            user = new User({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                password: randomPass,
                isVerified: true,
            });
            await user.save();
        } else if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }

        const jwtPayload = { user: { id: user.id } };

        jwt.sign(
            jwtPayload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error('Apple auth error:', err.message);
        res.status(401).json({ msg: 'Apple authentication failed' });
    }
});

// @route   PUT api/auth/update-name
// @desc    Update user name
// @access  Private
const auth = require('../middleware/auth');
router.put('/update-name', auth, async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ msg: 'Name is required' });
    }

    try {
        let user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.name = name;
        await user.save();

        res.json({ msg: 'Name updated successfully', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;

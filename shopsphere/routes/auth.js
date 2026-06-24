const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('../config/passport');
const User = require('../models/User');

const router = express.Router();
const SALT_ROUNDS = 10;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({
      $or: [
        { username },
        { email }
      ]
    }).lean();

    if (existing) {
      return res.status(409).json({ success: false, message: 'Username or email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ username, email, password_hash: passwordHash });

    res.status(201).json({ success: true, message: 'Account created successfully! You can now log in.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'ShopSphere@Admin123';

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
    }

    if (identifier === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.user = {
        id: 'admin',
        username: ADMIN_USERNAME,
        email: 'admin@shopsphere.local',
        isAdmin: true
      };
      return res.json({ success: true, message: 'Admin login successful!', user: req.session.user });
    }

    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    }).lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: `This account uses ${user.auth_provider === 'google' ? 'Google' : 'Facebook'} sign-in. Please use that button instead.`
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isAdmin: false
    };

    res.json({ success: true, message: 'Login successful!', user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_failed' }),
  (req, res) => {
    req.session.user = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      isAdmin: false
    };
    res.redirect('/shop');
  }
);

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=facebook_failed' }),
  (req, res) => {
    req.session.user = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      isAdmin: false
    };
    res.redirect('/shop');
  }
);

module.exports = router;

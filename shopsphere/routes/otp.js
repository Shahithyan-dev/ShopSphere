const express = require('express');
const User = require('../models/User');
const OtpCode = require('../models/OtpCode');
const { twilioClient, twilioEnabled } = require('../config/twilio');
const router = express.Router();
function sendOtp(to, message) {
  return twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  });
}

module.exports = router;
module.exports.sendOtp = sendOtp;

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  next();
}

function generateCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

router.get('/status', requireLogin, async (req, res) => {
  try {
    if (req.session.user.id === 'admin') {
      return res.json({ success: true, phoneVerified: true });
    }

    const user = await User.findById(req.session.user.id).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, phoneVerified: !!user.phone_verified });
  } catch (err) {
    console.error('OTP status error:', err);
    res.status(500).json({ success: false, message: 'Server error checking verification status.' });
  }
});

router.post('/request', requireLogin, async (req, res) => {
  try {
    if (!twilioEnabled) {
      return res.status(503).json({
        success: false,
        message: 'SMS verification is not configured yet. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env.'
      });
    }

    const { phone } = req.body;
    if (!phone || !/^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number with country code, e.g. +919876543210.'
      });
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpCode.create({
      user_id: req.session.user.id,
      phone: cleanPhone,
      code,
      expires_at: expiresAt
    });

    await twilioClient.messages.create({
      body: `Your ShopSphere verification code is ${code}. It expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: cleanPhone
    });

    res.json({ success: true, message: 'OTP sent! Check your phone.' });
  } catch (err) {
    console.error('OTP request error:', err);
    const twilioMessage = err.message && err.message.includes('Twilio')
      ? err.message
      : (err.message || 'Could not send OTP. Please try again.');
    res.status(500).json({ success: false, message: twilioMessage });
  }
});

router.post('/verify', requireLogin, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please enter the code you received.' });
    }

    const otp = await OtpCode.findOneAndUpdate(
      {
        user_id: req.session.user.id,
        code,
        used: false,
        expires_at: { $gt: new Date() }
      },
      { used: true },
      { sort: { created_at: -1 }, new: true }
    ).lean();

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code. Please request a new one.' });
    }

    await User.findByIdAndUpdate(req.session.user.id, {
      phone: otp.phone,
      phone_verified: true
    });

    res.json({ success: true, message: 'Phone verified successfully!' });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ success: false, message: 'Server error verifying code.' });
  }
});

// Duplicate export removed to preserve sendOtp helper

// routes/adminDeliveryOtp.js
const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendOtp } = require('./otp'); // helper from otp route

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  if (!req.session.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

// Send OTP to customer for delivery confirmation
router.post('/admin/orders/:orderId/send-otp', requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('user_id', 'phone username email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.status !== 'shipped') {
      return res.status(400).json({ success: false, message: 'OTP can only be sent for shipped orders.' });
    }
    if (!order.user_id || !order.user_id.phone) {
      return res.status(400).json({ success: false, message: 'Customer phone number not available.' });
    }
    // generate 6‑digit OTP
    const otp = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    order.deliveryOtp = otp;
    order.otpExpiresAt = expiresAt;
    await order.save();

    const message = `Your delivery OTP for order ${order.razorpay_order_id} is ${otp}. It expires in 10 minutes.`;
    await sendOtp(order.user_id.phone, message);
    res.json({ success: true, message: 'OTP sent to customer.' });
  } catch (err) {
    console.error('Send delivery OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

// Verify OTP and mark order as delivered
router.post('/admin/orders/:orderId/verify-otp', requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP code required.' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.status !== 'shipped') {
      return res.status(400).json({ success: false, message: 'Order is not in shipped state.' });
    }
    if (!order.deliveryOtp || !order.otpExpiresAt || order.otpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Resend required.' });
    }
    if (order.deliveryOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP.' });
    }
    // OTP verified – mark delivered
    order.status = 'delivered';
    order.deliveryOtp = null;
    order.otpExpiresAt = null;
    await order.save();
    res.json({ success: true, message: 'Order marked as delivered.' });
  } catch (err) {
    console.error('Verify delivery OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
});

module.exports = router;

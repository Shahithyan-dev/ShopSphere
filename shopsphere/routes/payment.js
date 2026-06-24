const express = require('express');
const crypto = require('crypto');
const Product = require('../models/Product');
const CartItem = require('../models/CartItem');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { razorpay, razorpayEnabled } = require('../config/razorpay');
const allowInternational = process.env.ALLOW_INTERNATIONAL === 'true';

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  next();
}

router.post('/create-order', requireLogin, async (req, res) => {
  try {
    if (!razorpayEnabled) {
      return res.status(503).json({
        success: false,
        message: 'Payments are not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.'
      });
    }

    const cartRows = await CartItem.find({ user_id: req.session.user.id })
      .populate('product_id')
      .lean();

    if (cartRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    const outOfStock = cartRows.find((item) => !item.product_id || item.quantity > item.product_id.stock);
    if (outOfStock) {
      const productName = outOfStock.product_id ? outOfStock.product_id.name : 'Unknown product';
      const remaining = outOfStock.product_id ? outOfStock.product_id.stock : 0;
      return res.status(400).json({
        success: false,
        message: `"${productName}" only has ${remaining} left in stock.`
      });
    }

    const totalAmount = cartRows.reduce((sum, item) => sum + item.product_id.price * item.quantity, 0);
    const amountInPaise = Math.round(totalAmount * 100);

    const currency = allowInternational ? (req.body.currency || 'INR') : 'INR';
    // Use the chosen currency for Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency,
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    });
    // Save order with selected currency
    const order = await Order.create({
      user_id: req.session.user.id,
      razorpay_order_id: razorpayOrder.id,
      amount: totalAmount,
      currency: currency,
      status: 'created',
      delivery_address: delivery_address || null,
      delivery_location: delivery_location ? {
        latitude: delivery_location.latitude,
        longitude: delivery_location.longitude
      } : null
    });

    const orderItems = cartRows.map((item) => ({
      order_id: order._id,
      product_id: item.product_id._id,
      product_name: item.product_id.name,
      price: item.product_id.price,
      quantity: item.quantity
    }));

    await OrderItem.insertMany(orderItems);

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      dbOrderId: order._id.toString()
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Could not create order. Please try again.' });
  }
});

router.post('/verify', requireLogin, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    const order = await Order.findOne({ razorpay_order_id, user_id: req.session.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!isValid) {
      order.status = 'failed';
      await order.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    order.status = 'paid';
    order.razorpay_payment_id = razorpay_payment_id;
    order.paid_at = new Date();
    await order.save();

    const items = await OrderItem.find({ order_id: order._id }).lean();
    for (const item of items) {
      const product = await Product.findById(item.product_id);
      if (product) {
        product.stock = Math.max(product.stock - item.quantity, 0);
        await product.save();
      }
    }

    await CartItem.deleteMany({ user_id: req.session.user.id });

    res.json({ success: true, message: 'Payment verified! Your order is confirmed.' });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ success: false, message: 'Server error verifying payment.' });
  }
});

router.get('/orders', requireLogin, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.session.user.id })
      .sort({ created_at: -1 })
      .lean();

    for (const order of orders) {
      order.id = order._id.toString();
      order.items = await OrderItem.find({ order_id: order._id }).lean();
    }

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching orders.' });
  }
});

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please log in first.' });
  }
  if (!req.session.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

router.get('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user_id', 'username email')
      .sort({ created_at: -1 })
      .lean();

    for (const order of orders) {
      order.id = order._id.toString();
      order.items = await OrderItem.find({ order_id: order._id }).lean();
    }

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Get admin orders error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching admin orders.' });
  }
});

router.put('/admin/orders/:orderId/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['created', 'paid', 'failed', 'accepted', 'rejected', 'shipped', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status.' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: `Order status updated to ${status}.`, order });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ success: false, message: 'Server error updating order status.' });
  }
});

module.exports = router;

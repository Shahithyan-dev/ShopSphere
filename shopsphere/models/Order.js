const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  razorpay_order_id: { type: String, required: true, unique: true, trim: true },
  razorpay_payment_id: { type: String, default: null, trim: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR', trim: true },
  status: { type: String, enum: ['created', 'paid', 'failed', 'accepted', 'rejected', 'shipped', 'delivered', 'cancelled'], default: 'created' },
  deliveryOtp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  delivery_address: { type: String, default: null },
  delivery_location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  created_at: { type: Date, default: Date.now },
  paid_at: { type: Date, default: null }
}, {
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
  },
  toObject: {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
  }
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports = Order;

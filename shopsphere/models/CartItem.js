const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 1 },
  added_at: { type: Date, default: Date.now }
});

cartItemSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

const CartItem = mongoose.models.CartItem || mongoose.model('CartItem', cartItemSchema);
module.exports = CartItem;

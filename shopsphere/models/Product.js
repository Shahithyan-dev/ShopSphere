const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  original_price: { type: Number, default: null },
  rating: { type: Number, default: 4.0 },
  image_emoji: { type: String, default: '🛒' },
  image_url: { type: String, default: null },
  description: { type: String, default: '' },
  stock: { type: Number, default: 100 },
  created_at: { type: Date, default: Date.now }
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

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
module.exports = Product;

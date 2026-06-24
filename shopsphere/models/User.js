const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password_hash: { type: String, default: null },
  is_admin: { type: Boolean, default: false },
  auth_provider: { type: String, default: 'local' },
  google_id: { type: String, unique: true, sparse: true },
  facebook_id: { type: String, unique: true, sparse: true },
  phone: { type: String, default: null },
  phone_verified: { type: Boolean, default: false },
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

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;

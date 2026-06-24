const mongoose = require('mongoose');

const otpCodeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phone: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  expires_at: { type: Date, required: true },
  used: { type: Boolean, default: false },
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

const OtpCode = mongoose.models.OtpCode || mongoose.model('OtpCode', otpCodeSchema);
module.exports = OtpCode;

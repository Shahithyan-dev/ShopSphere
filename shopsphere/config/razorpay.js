const Razorpay = require('razorpay');
require('dotenv').config();

// Only construct a real client if both keys are present — this mirrors the
// pattern used for Google/Facebook OAuth, so the app doesn't crash on
// startup if you haven't set up Razorpay yet. Routes that need it check
// `razorpayEnabled` first and return a clear error instead of throwing.
const razorpayEnabled = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const razorpay = razorpayEnabled
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

module.exports = { razorpay, razorpayEnabled };

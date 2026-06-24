const twilio = require('twilio');
require('dotenv').config();

// Same enabled/disabled pattern as Google, Facebook, and Razorpay — only
// construct a real client if all three required values are present, so the
// app doesn't crash on startup if Twilio isn't configured yet.
const twilioEnabled = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
);

const twilioClient = twilioEnabled
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

module.exports = { twilioClient, twilioEnabled };

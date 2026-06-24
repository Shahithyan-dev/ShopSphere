const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();
require('./config/db');

const User = require('./models/User');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const paymentRoutes = require('./routes/payment');
const otpRoutes = require('./routes/otp');
const adminDeliveryOtpRoutes = require('./routes/adminDeliveryOtp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup (keeps the user logged in across requests)
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true
  }
}));

// Passport is only used to handle the OAuth handshake itself (Google/Facebook
// redirect + callback). Once that's done, we copy the result into
// req.session.user (see routes/auth.js) and the rest of the app never has to
// know or care whether Passport is involved at all.
app.use(passport.initialize());
app.use(passport.session());

// Serve the React production build.
// Run `npm run build` inside the shopsphere-react folder first — that creates
// a `dist` folder, which we point to here. During development you'll usually
// run the React dev server separately (npm run dev inside shopsphere-react)
// instead of relying on this static serve.
const REACT_BUILD_PATH = path.join(__dirname, '..', 'shopsphere-react', 'dist');
app.use(express.static(REACT_BUILD_PATH));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api', adminDeliveryOtpRoutes);

// Route to check current login status (used by every React page via AuthContext)
app.get('/api/me', async (req, res) => {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }

  if (req.session.user.id === 'admin') {
    return res.json({ loggedIn: true, user: { ...req.session.user, phoneVerified: true } });
  }

  try {
    const user = await User.findById(req.session.user.id).lean();
    const phoneVerified = user ? !!user.phone_verified : false;
    res.json({ loggedIn: true, user: { ...req.session.user, phoneVerified } });
  } catch (err) {
    console.error('Error checking phone verification in /api/me:', err);
    res.json({ loggedIn: true, user: { ...req.session.user, phoneVerified: false } });
  }
});

// SPA fallback: any non-API route serves the React app, and React Router
// takes over from there to render the right page (login, shop, admin, etc).
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(REACT_BUILD_PATH, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;

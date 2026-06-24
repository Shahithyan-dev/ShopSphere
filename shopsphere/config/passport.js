const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || null);
  } catch (err) {
    done(err, null);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.BASE_URL ? `${process.env.BASE_URL}/api/auth/google/callback` : '/api/auth/google/callback',
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const displayName = profile.displayName || `google_${googleId}`;

      let user = await User.findOne({ google_id: googleId });
      if (user) {
        return done(null, user);
      }

      if (email) {
        user = await User.findOne({ email });
        if (user) {
          user.google_id = googleId;
          await user.save();
          return done(null, user);
        }
      }

      let baseUsername = (email ? email.split('@')[0] : displayName).replace(/[^a-zA-Z0-9_]/g, '');
      if (baseUsername.length < 3) baseUsername = `user_${googleId}`;
      let username = baseUsername;
      let suffix = 1;
      while (await User.exists({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      const newUser = await User.create({
        username,
        email: email || `${googleId}@google.placeholder`,
        password_hash: null,
        auth_provider: 'google',
        google_id: googleId
      });

      return done(null, newUser);
    } catch (err) {
      return done(err, null);
    }
  }));
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.BASE_URL ? `${process.env.BASE_URL}/api/auth/facebook/callback` : '/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails'],
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const facebookId = profile.id;
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const displayName = profile.displayName || `facebook_${facebookId}`;

      let user = await User.findOne({ facebook_id: facebookId });
      if (user) {
        return done(null, user);
      }

      if (email) {
        user = await User.findOne({ email });
        if (user) {
          user.facebook_id = facebookId;
          await user.save();
          return done(null, user);
        }
      }

      let baseUsername = (email ? email.split('@')[0] : displayName).replace(/[^a-zA-Z0-9_]/g, '');
      if (baseUsername.length < 3) baseUsername = `user_${facebookId}`;
      let username = baseUsername;
      let suffix = 1;
      while (await User.exists({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      const newUser = await User.create({
        username,
        email: email || `${facebookId}@facebook.placeholder`,
        password_hash: null,
        auth_provider: 'facebook',
        facebook_id: facebookId
      });

      return done(null, newUser);
    } catch (err) {
      return done(err, null);
    }
  }));
}

module.exports = passport;

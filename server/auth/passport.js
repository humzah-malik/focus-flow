// Import required modules
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const path = require('path');
// near the top of passport.js
const User = require('../models/user');  // <--- Make sure you have this!
const LocalStrategy = require('passport-local').Strategy;
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Debug: Log environment variables in development only
if (process.env.NODE_ENV === 'development') {
  console.log('Environment Variables:', {
    clientID: process.env.TODOIST_CLIENT_ID,
    clientSecret: process.env.TODOIST_CLIENT_SECRET,
    redirectURI: process.env.TODOIST_REDIRECT_URI,
  });
}

/*
// Configure Todoist OAuth2 strategy
passport.use('todoist', new OAuth2Strategy(
  {
    authorizationURL: 'https://todoist.com/oauth/authorize',
    tokenURL: 'https://todoist.com/oauth/access_token',
    clientID: process.env.TODOIST_CLIENT_ID,
    clientSecret: process.env.TODOIST_CLIENT_SECRET,
    callbackURL: process.env.TODOIST_REDIRECT_URI,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Fetch user info from Todoist's sync API
      const response = await axios.get('https://api.todoist.com/sync/v9/sync', {
        params: {
          sync_token: '*',
          resource_types: '["user"]',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userInfo = response.data.user;

      // Build the user object
      const user = {
        accessToken,
        refreshToken,
        id: userInfo.id,
        name: userInfo.full_name,
        email: userInfo.email,
      };

      return done(null, user);
    } catch (error) {
      console.error('Error fetching Todoist user info:', error);
      return done(error);
    }
  }
));
*/

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }
      
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid password' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Serialize user (save only accessToken for simplicity)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Use await on the query
    const user = await User.findById(id).exec(); 
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

module.exports = passport;

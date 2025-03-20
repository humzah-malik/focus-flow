// Import required modules
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const path = require('path');
const User = require('../models/user'); 
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

// Serialize user
passport.serializeUser((user, done) => {
  done(null, { id: user.id, todoistToken: user.todoistToken }); // Store todoistToken
});

//De-Serialize user
passport.deserializeUser(async (obj, done) => {
  try {
    const user = await User.findById(obj.id).exec();
    if (!user) return done(null, false);
    
    user.todoistToken = obj.todoistToken; // Restore Todoist token in session
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});


module.exports = passport;

const express = require('express');
const router = express.Router();
const User = require('../models/user'); // User model
const bcrypt = require('bcrypt');
const path = require('path');
const passport = require('passport');

// User signup route
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('Email and password are required.');

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('User already exists.');

    const newUser = new User({ email, password });
    await newUser.save();
    res.status(201).send('User registered successfully!');
    // Inside the signup route, after hashing the password
    console.log('Hashed password:', newUser.password);
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).send('Error registering user.');
  }
});
  

// User login route
/*
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login request received:', { email, password }); // Log the request body

    try {
        const user = await User.findOne({ email });
        console.log('User found:', user); // Log the user object

        if (!user) {
            console.log('User not found'); // Log if user is not found
            return res.status(400).send('User not found');
        }

        const isMatch = await user.comparePassword(password);
        console.log('Password match:', isMatch); // Log password comparison result

        if (!isMatch) {
            console.log('Invalid password'); // Log if password doesn't match
            return res.status(400).send('Invalid credentials');
        }

        console.log('Login successful');
        res.status(200).send('Login successful');
    } catch (err) {
        console.error('Error during login:', err); // Log the error
        res.status(500).send('Error logging in');
    }
});
*/

router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/index.html', 
    failureRedirect: '/login.html',
    failureFlash: true
  })
);

// POST/logout route
router.post('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).send('Error logging out.');
    }

    // Destroys the entire session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).send('Error logging out.');
      }

      // Clear the cookie
      res.clearCookie('connect.sid');

      // Respond to the client
      res.status(200).send('Logout successful!');
    });
  });
});

// User logout route
router.get('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).send('Error logging out.');
    }
    
    // Destroy the entire session:
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).send('Error logging out.');
      }

      // Optionally clear the cookie in the response, so the browser removes it immediately:
      res.clearCookie('connect.sid');

      // Now the user session + cookie are fully invalidated
      res.status(200).send('Logout successful!');
    });
  });
});

router.get('/check-session', (req, res) => {
  res.json({ loggedIn: req.isAuthenticated() });
});

// Route to serve the signup page
router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/signup.html'));
});

module.exports = router;

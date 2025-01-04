const express = require('express');
const router = express.Router();
const { passport } = require('../auth/passport');

// Route to start Google OAuth2 login
router.get('/google', passport.authenticate('google', {
    scope: [
        'https://www.googleapis.com/auth/tasks.readonly',
        'https://www.googleapis.com/auth/calendar.readonly'
    ]
}));

// OAuth2 callback route
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    if (req.isAuthenticated()) {
        const { photos } = req.user.profile; // Google profile picture
        res.json({ loggedIn: true, profilePicture: photos[0].value });
        res.redirect('/timer'); // Redirect to timer page on successful login
    } else {
        res.json({ loggedIn: false });
    }
});

// Logout route
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

module.exports = router;

// session management
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// passport initialization
const { passport } = require('./server/auth/passport');
app.use(passport.initialize());
app.use(passport.session());

// auth Routes
const authRoutes = require('./server/routes/auth');
app.use('/auth', authRoutes);

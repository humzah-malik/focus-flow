// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session'); // For managing sessions
const passport = require('./server/auth/passport'); // Use custom passport configuration
const authRoutes = require('./server/routes/auth'); // Import authentication routes
const taskRoutes = require('./server/routes/tasks');
const todoistRoutes = require('./server/routes/todoist');
const settingsRoutes = require('./server/routes/settings'); // Add this line
const statsRoutes = require('./server/routes/stats');

require('dotenv').config(); // Load environment variables from .env

// Initialize the app
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware for session management
app.use(
    session({
      secret: process.env.SESSION_SECRET || 'secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // Set to true when using HTTPS
    })
  );
  
app.use(passport.initialize());
app.use(passport.session());

app.use('/tasks', taskRoutes);
app.use('/settings', settingsRoutes);
app.use('/stats', statsRoutes); // mount at /stats

// Protect stats.html
app.get('/stats.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Middleware to serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Use authentication routes
app.use('/', authRoutes);

app.use('/', todoistRoutes);

const mongoose = require('mongoose');
console.log('MongoDB URI:', process.env.MONGO_URI);
mongoose.set('debug', true);
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware to protect routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/login.html');
}

// Basic route to check if the server is working
app.get('/', (req, res) => {
  res.send('Server is running!');
});

(async () => {
    const open = (await import('open')).default;
  
    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      open(`http://localhost:${PORT}`); // Automatically open in browser
    });
  })();
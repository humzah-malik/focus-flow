// Import required modules
const express = require('express');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env

// Initialize the app
const app = express();

// Middleware to serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Basic route to check if the server is working
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Start the server
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

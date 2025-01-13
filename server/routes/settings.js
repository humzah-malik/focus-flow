const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Adjust the path if necessary

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).send('Unauthorized');
}

// GET /settings - Get current user's settings
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('settings');
        if (!user) return res.status(404).send('User not found');
        res.json(user.settings);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).send('Server error');
    }
});

// PUT /settings - Update current user's settings
router.put('/', ensureAuthenticated, async (req, res) => {
    try {
        const { 
            workDuration, 
            shortBreak, 
            longBreak, 
            sessionsBeforeLongBreak,
            autoStartBreaks,
            autoStartTimer 
        } = req.body;

        // Optional: Validate input values here

        const updatedSettings = {};
        if (workDuration !== undefined) updatedSettings['settings.workDuration'] = workDuration;
        if (shortBreak !== undefined) updatedSettings['settings.shortBreak'] = shortBreak;
        if (longBreak !== undefined) updatedSettings['settings.longBreak'] = longBreak;
        if (sessionsBeforeLongBreak !== undefined) updatedSettings['settings.sessionsBeforeLongBreak'] = sessionsBeforeLongBreak;
        if (autoStartBreaks !== undefined) updatedSettings['settings.autoStartBreaks'] = autoStartBreaks;
        if (autoStartTimer !== undefined) updatedSettings['settings.autoStartTimer'] = autoStartTimer;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updatedSettings },
            { new: true, runValidators: true }
        ).select('settings');

        res.json(user.settings);
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).send('Server error');
    }
});

// DELETE /settings - Reset current user's settings to original defaults
router.delete('/', ensureAuthenticated, async (req, res) => {
    try {
        // Define original default settings
        const originalDefaults = {
            workDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            sessionsBeforeLongBreak: 4,
            autoStartBreaks: false,
            autoStartTimer: false,
        };

        // Update user's settings to original defaults
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { settings: originalDefaults } },
            { new: true, runValidators: true }
        ).select('settings');

        res.json(user.settings);
    } catch (err) {
        console.error('Error resetting settings:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;

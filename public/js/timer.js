// Global Variables
let startTime = 25 * 60; // Default timer duration in seconds (25 minutes)
let currentTime = startTime; // Tracks the remaining time in the current session
let timerInterval = null; // Holds the reference to the interval timer
let isRunning = false; // Boolean to track whether the timer is running
let currentSession = 'Timer'; // Tracks the current session type: 'Timer', 'Short Break', or 'Long Break'
let sessionCount = 1; // Tracks the number of completed work sessions
let sessionsBeforeLongBreak = 4; // Default number of work sessions before a long break

// Load settings and attach event listeners
document.addEventListener('DOMContentLoaded', function () {
    loadSettings(); // Load settings on start
    attachEventListeners(); // Attach event listeners to UI elements
});

// Attach event listeners to buttons
function attachEventListeners() {
    // Event listener for start/pause button
    document.getElementById('start-pause-btn').addEventListener('click', toggleTimer);
    // Event listener for reset button
    document.getElementById('reset-btn').addEventListener('click', resetTimer);
    // Event listener for skip button
    document.getElementById('skip-btn').addEventListener('click', skipToBreak);
}

// Toggle timer between running and paused states
function toggleTimer() {
    if (!isRunning) {
        startTimer(); // Start the timer if not running
    } else {
        pauseTimer(); // Pause the timer if running
    }
}

// Start or continue the timer
function startTimer() {
    if (timerInterval) return; // Prevent multiple intervals
    isRunning = true; // Set running state to true
    timerInterval = setInterval(() => {
        currentTime--; // Decrement the timer by 1 second
        if (currentTime <= 0) {
            currentTime = 0; // Ensure it doesn't go negative
            clearInterval(timerInterval); // Clear the timer interval
            timerInterval = null; // Reset interval reference
            isRunning = false; // Set running state to false
            handleSessionCompletion(); // Handle what happens when session ends
        }
        updateDisplay(); // Update the timer display
    }, 1000); // Run the interval every second
    updateButtonIcon(); // Update the button icon to reflect state
}

// Pause the currently running timer
function pauseTimer() {
    clearInterval(timerInterval); // Stop the interval
    timerInterval = null; // Reset interval reference
    isRunning = false; // Set running state to false
    updateButtonIcon(); // Update the button icon to reflect state
}

// Reset the timer to the start of the current session
function resetTimer() {
    clearInterval(timerInterval); // Stop the interval
    timerInterval = null; // Reset interval reference
    isRunning = false; // Set running state to false
    currentTime = currentSession === 'Timer' ? startTime : getBreakDuration(); // Reset time based on session
    updateDisplay(); // Update the timer display
    updateButtonIcon(); // Update the button icon to reflect state
}

// Skip to the next session type based on current state
function skipToBreak() {
    console.log(`Skipping to next session from: ${currentSession}`);
    clearInterval(timerInterval); // Stop the interval
    timerInterval = null; // Reset interval reference
    isRunning = false; // Set running state to false

    if (currentSession === 'Timer') {
        handleSessionCompletion(); // Handle session completion if skipping during Timer
    } else {
        startNewTimerSession(); // Start a new Timer session if skipping a break
    }

    updateDisplay(); // Update the timer display
    updateButtonIcon(); // Update the button icon to reflect state
}

// Handle completion of a session
function handleSessionCompletion() {
    console.log(`Session: ${currentSession}, Time: ${currentTime}, Count: ${sessionCount}`);

    if (currentSession === 'Timer') {
        if (sessionCount < sessionsBeforeLongBreak) {
            sessionCount++; // Increment session count for work sessions
            startShortBreak(); // Start a short break
        } else {
            startLongBreak(); // Start a long break after the set number of sessions
            sessionCount = 1; // Reset session count after long break
        }
    } else {
        startNewTimerSession(); // Start a new work session after a break
    }
}

// Start a new "Timer" session
function startNewTimerSession() {
    currentSession = 'Timer'; // Set the session type to Timer
    currentTime = startTime; // Reset the timer to the work duration
    updateDisplay(); // Update the timer display
}

// Start a short break session
function startShortBreak() {
    currentSession = 'Short Break'; // Set the session type to Short Break
    currentTime = parseInt(localStorage.getItem('short-break') || 5) * 60; // Get short break duration from settings or default
    updateDisplay(); // Update the timer display
}

// Start a long break session
function startLongBreak() {
    currentSession = 'Long Break'; // Set the session type to Long Break
    currentTime = parseInt(localStorage.getItem('long-break') || 15) * 60; // Get long break duration from settings or default
    updateDisplay(); // Update the timer display
}

// Load settings from localStorage
function loadSettings() {
    const workDuration = parseInt(localStorage.getItem('work-duration')) || 25; // Get work duration from settings or default
    startTime = workDuration * 60; // Convert minutes to seconds
    currentTime = startTime; // Reset current time to the work duration
    sessionsBeforeLongBreak = parseInt(localStorage.getItem('sessions')) || 4; // Get sessions before long break from settings or default
    updateDisplay(); // Update the timer display
}

// Update the timer display and title based on current session
function updateDisplay() {
    const minutes = Math.floor(currentTime / 60); // Calculate minutes
    const seconds = currentTime % 60; // Calculate remaining seconds

    // Update the displayed timer
    document.getElementById('timer-display').textContent = 
        `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    document.getElementById('timer-title').textContent = currentSession; // Update the session title

    // Only update the browser's title if the timer is running
    if (isRunning) {
        document.title = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
        document.title = "Study Timer"; // Default title when timer is not running
    }

    // Update session info
    const sessionInfo = document.getElementById('session-info');

    // Correct logic for displaying session count
    if (currentSession === 'Timer') {
        sessionInfo.textContent = `${sessionCount} of ${sessionsBeforeLongBreak} Sessions`;
    } else if (currentSession === 'Short Break') {
        sessionInfo.textContent = `${sessionCount - 1} of ${sessionsBeforeLongBreak} Sessions`;
    } else if (currentSession === 'Long Break') {
        sessionInfo.textContent = `${sessionsBeforeLongBreak} of ${sessionsBeforeLongBreak} Sessions`;
    }
}

// Update the start/pause button icon based on the timer's running state
function updateButtonIcon() {
    const icon = document.getElementById('start-pause-btn').querySelector('i');
    if (isRunning) {
        icon.classList.remove('fa-play'); // Remove play icon
        icon.classList.add('fa-pause'); // Add pause icon
    } else {
        icon.classList.remove('fa-pause'); // Remove pause icon
        icon.classList.add('fa-play'); // Add play icon
    }
}

// Get the appropriate break duration
function getBreakDuration() {
    if (currentSession === 'Short Break') {
        return parseInt(localStorage.getItem('short-break') || 5) * 60; // Return short break duration in seconds
    } else if (currentSession === 'Long Break') {
        return parseInt(localStorage.getItem('long-break') || 15) * 60; // Return long break duration in seconds
    }
    return startTime; // Return default work duration for Timer session
}

// public/js/timer.js

// Global Variables
let startTime = 25 * 60; // Default timer duration in seconds (25 minutes)
let currentTime = startTime; // Tracks the remaining time in the current session
let timerInterval = null; // Holds the reference to the interval timer
let isRunning = false; // Boolean to track whether the timer is running
let currentSession = 'Timer'; // Tracks the current session type: 'Timer', 'Short Break', or 'Long Break'
let sessionCount = 1; // Tracks the number of completed work sessions
let sessionsBeforeLongBreak = 4; // Default number of work sessions before a long break

// Variables to hold auto-start settings
let autoStartBreaks = false;
let autoStartTimer = false;

// Variables to hold break durations
let shortBreakDuration = 5 * 60; // default 5 minutes
let longBreakDuration = 15 * 60; // default 15 minutes

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

// Function to check if user is logged in
async function isLoggedIn() {
    try {
        const res = await fetch('/check-session', { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to check session');
        const data = await res.json();
        return data.loggedIn;
    } catch (err) {
        console.error('Error checking session:', err);
        return false;
    }
}

// Function to load settings from server
async function loadSettingsFromServer() {
    try {
        const res = await fetch('/settings', { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch settings');
        const settings = await res.json();
        // Set global variables based on settings
        startTime = settings.workDuration * 60;
        currentTime = startTime;
        sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak;
        autoStartBreaks = settings.autoStartBreaks;
        autoStartTimer = settings.autoStartTimer;

        shortBreakDuration = settings.shortBreak * 60;
        longBreakDuration = settings.longBreak * 60;

        updateDisplay(); // Update the timer display

        // Do not auto-start on page load
    } catch (err) {
        console.error('Error loading settings from server:', err);
        loadDefaultSettings();
    }
}

// Function to load default settings
function loadDefaultSettings() {
    // Set default settings
    startTime = 25 * 60;
    currentTime = startTime;
    sessionsBeforeLongBreak = 4;
    autoStartBreaks = false;
    autoStartTimer = false;

    shortBreakDuration = 5 * 60;
    longBreakDuration = 15 * 60;

    updateDisplay(); // Update the timer display

    // Do not auto-start on page load
}

// Function to load settings from localStorage
function loadSettingsFromLocalStorage() {
    // Load settings from localStorage or use defaults
    const settings = JSON.parse(localStorage.getItem('settings')) || {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        sessionsBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartTimer: false,
    };

    startTime = settings.workDuration * 60;
    currentTime = startTime;
    sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak;
    autoStartBreaks = settings.autoStartBreaks;
    autoStartTimer = settings.autoStartTimer;

    shortBreakDuration = settings.shortBreak * 60;
    longBreakDuration = settings.longBreak * 60;

    updateDisplay(); // Update the timer display
}

// Function to load settings based on login status
async function loadSettings() {
    const loggedIn = await isLoggedIn();
    if (loggedIn) {
        await loadSettingsFromServer();
    } else {
        loadSettingsFromLocalStorage();
    }
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
    if (timerInterval) return;
    isRunning = true;
    timerInterval = setInterval(() => {
        currentTime--;
        if (currentTime <= 0) {
            currentTime = 0;
            clearInterval(timerInterval);
            timerInterval = null;
            isRunning = false;
            handleSessionCompletion();
        }
        updateDisplay();
    }, 1000);
    updateButtonIcon();

    // Dispatch start-task-timer only if currentSession is 'Timer'
    if (currentSession === 'Timer') {
        document.dispatchEvent(new CustomEvent('start-task-timer', { detail: { session: currentSession } }));
    }
}

// Pause the timer
function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    updateButtonIcon();

    // Dispatch stop-task-timer only if currentSession is 'Timer'
    if (currentSession === 'Timer') {
        document.dispatchEvent(new Event('stop-task-timer'));
    }
}

// Reset the timer to the start of the current session
function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;

    // Reset the main timer's time
    currentTime = currentSession === 'Timer' ? startTime : getBreakDuration();
    updateDisplay();
    updateButtonIcon();

    // Dispatch events to reset task timers
    document.dispatchEvent(new Event('stop-task-timer'));
    document.dispatchEvent(new Event('reset-task-timer'));
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

    // Determine the next session type
    let nextSessionType = currentSession;
    if (currentSession === 'Timer') {
        nextSessionType = (sessionCount > sessionsBeforeLongBreak) ? 'Long Break' : 'Short Break';
    } else {
        nextSessionType = 'Timer';
    }

    // Function to start the next session after a delay
    const startNextSession = () => {
        if (nextSessionType === 'Timer' && autoStartTimer) {
            startTimer();
        } else if ((nextSessionType === 'Short Break' || nextSessionType === 'Long Break') && autoStartBreaks) {
            startTimer();
        }
    };

    // Decide whether to auto-start the next session based on settings
    if (
        (currentSession === 'Timer' && autoStartBreaks) ||
        ((currentSession === 'Short Break' || currentSession === 'Long Break') && autoStartTimer)
    ) {
        // Add a 1-2 second delay before starting the next session
        setTimeout(startNextSession, 1500); // 1.5 seconds delay

        // Update the Play button display when session starts automatically
        updateButtonIcon(); // Ensure the Play/Pause button reflects the running state
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
    currentTime = shortBreakDuration; // Get short break duration from settings or default
    updateDisplay(); // Update the timer display
}

// Start a long break session
function startLongBreak() {
    currentSession = 'Long Break'; // Set the session type to Long Break
    currentTime = longBreakDuration; // Get long break duration from settings or default
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
        return shortBreakDuration; // Return short break duration in seconds
    } else if (currentSession === 'Long Break') {
        return longBreakDuration; // Return long break duration in seconds
    }
    return startTime; // Return default work duration for Timer session
}

// ------------------------------------------------------------------
// 6) RESPOND TO MAIN TIMER EVENTS (FROM tasks.js)
// ------------------------------------------------------------------
document.addEventListener('start-task-timer', () => {
    // No change needed
    // If a task is active, resume its interval
    if (activeTaskId) {
        startActiveTaskInterval();
    }
});

document.addEventListener('stop-task-timer', () => {
    // No change needed
    // Stop counting time on the active task
    stopActiveTaskInterval();

    // If there's an active task, update the DB with the new timeSpent
    if (activeTaskId) {
        // 1) old total from DB
        const oldDB = dbTimeSpent[activeTaskId] || 0;
        // 2) localTime from this session
        const local = localTime[activeTaskId] || 0;
        // 3) new total = old + local
        const newTotal = oldDB + local;

        fetch(`/tasks/${activeTaskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeSpent: newTotal })
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to update timeSpent');
            return res.json();
        })
        .then(data => {
            console.log('Updated timeSpent in DB:', data.task.timeSpent);
            updateTaskTotalTime(data.task._id, data.task.timeSpent);
        })
        .catch(err => console.error(err));
    }
});

// Reset task timer
document.addEventListener('reset-task-timer', () => {
    // No change needed
    mainTimerRunning = false;
    stopActiveTaskInterval();

    if (activeTaskId) {
        // Reset the local time to 0
        taskTimes[activeTaskId] = 0;

        // Update the local DOM display
        const activeTask = document.querySelector(`[data-task-id="${activeTaskId}"]`);
        if (activeTask) {
            activeTask.querySelector('.task-local-time').textContent = '0m0s';
        }

        // **NEW**: PUT request to reset timeSpent on the server
        /*
        fetch(`/tasks/${activeTaskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeSpent: 0 })
        })
        .then(res => {
            if (!res.ok) {
                throw new Error('Failed to reset timeSpent in DB');
            }
            return res.json();
        })
        .then(data => {
            console.log('Successfully reset task on server:', data.task);
        })
        .catch(err => {
            console.error(err);
        });
        */
    }
});

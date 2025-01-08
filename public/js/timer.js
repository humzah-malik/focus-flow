// Global Variables
let startTime = 25 * 60; // Default timer duration in seconds (25 minutes)
let currentTime = startTime; // Tracks the remaining time in the current session
let timerInterval = null; // Holds the reference to the interval timer
let isRunning = false; // Boolean to track whether the timer is running
let currentSession = 'Timer'; // Tracks the current session type: 'Timer', 'Short Break', or 'Long Break'
let sessionCount = 1; // Tracks the number of completed work sessions
let sessionsBeforeLongBreak = 4; // Default number of work sessions before a long break
let tasks = [];
let activeTaskIndex = null;

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

    document.getElementById('add-task-btn').addEventListener('click', addTask);
    document.getElementById('task-list').addEventListener('click', handleTaskClick);

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

    // Start task timer
    document.dispatchEvent(new CustomEvent('start-task-timer'));
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    updateButtonIcon();

    // Stop task timer
    document.dispatchEvent(new Event('stop-task-timer'));
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

    // Dispatch an event so tasks.js can do its reset
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

function addTask() {
    const taskInput = document.getElementById('task-name');
    const taskName = taskInput.value.trim();
    if (!taskName) return alert('Task name cannot be empty.');

    tasks.push({ name: taskName, timeSpent: 0, completed: false });
    taskInput.value = ''; // Clear input
    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        if (index === activeTaskIndex) taskElement.classList.add('active');
        if (task.completed) taskElement.classList.add('completed');

        taskElement.innerHTML = `
            <span>${task.name}</span>
            <div>
                <span>${Math.floor(task.timeSpent / 60)}m</span>
                <input type="checkbox" ${task.completed ? 'checked' : ''} data-index="${index}" />
            </div>
        `;
        taskList.appendChild(taskElement);
    });
}

function handleTaskClick(event) {
    const target = event.target;

    if (target.tagName === 'INPUT' && target.type === 'checkbox') {
        const index = target.getAttribute('data-index');
        tasks[index].completed = target.checked;
        renderTasks();
    } else if (target.tagName === 'SPAN') {
        const taskIndex = [...target.parentElement.parentElement.children].indexOf(target.parentElement);
        activeTaskIndex = taskIndex;
        renderTasks();
    }
}

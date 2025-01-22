// public/js/settings.js

import DEFAULT_SETTINGS from './defaultSettings.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded');
    // Get references to all slider elements and their display spans
    const workDurationSlider = document.getElementById('work-duration-slider');
    const workDurationValue = document.getElementById('work-duration-value');

    const shortBreakSlider = document.getElementById('short-break-slider');
    const shortBreakValue = document.getElementById('short-break-value');

    const longBreakSlider = document.getElementById('long-break-slider');
    const longBreakValue = document.getElementById('long-break-value');

    const sessionsSlider = document.getElementById('sessions-slider');
    const sessionsValue = document.getElementById('sessions-value');

    const autoStartAllCheckbox = document.getElementById('auto-start-all');

    const resetDefaultBtn = document.getElementById('reset-default-btn'); // Reset button

    // Function to update the display value next to each slider
    const updateDisplayValue = (slider, display) => {
        const unit = slider.id.includes('sessions') ? '' : ' min';
        display.textContent = `${slider.value}${unit}`;
        console.log(`${slider.id}: ${slider.value}`);
    };    

    // Initialize display values based on current slider positions
    updateDisplayValue(workDurationSlider, workDurationValue);
    updateDisplayValue(shortBreakSlider, shortBreakValue);
    updateDisplayValue(longBreakSlider, longBreakValue);
    updateDisplayValue(sessionsSlider, sessionsValue);

    // Add event listeners to update display values in real-time as sliders are moved
    workDurationSlider.addEventListener('input', () => {
        updateDisplayValue(workDurationSlider, workDurationValue);
    });

    shortBreakSlider.addEventListener('input', () => {
        updateDisplayValue(shortBreakSlider, shortBreakValue);
    });

    longBreakSlider.addEventListener('input', () => {
        updateDisplayValue(longBreakSlider, longBreakValue);
    });

    sessionsSlider.addEventListener('input', () => {
        updateDisplayValue(sessionsSlider, sessionsValue);
    });

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

    // Function to load settings from server (MongoDB)
    async function loadSettingsFromServer() {
        try {
            const res = await fetch('/settings', { method: 'GET', credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch settings');
            const settings = await res.json();
            // Set sliders based on settings
            workDurationSlider.value = settings.workDuration;
            updateDisplayValue(workDurationSlider, workDurationValue);

            shortBreakSlider.value = settings.shortBreak;
            updateDisplayValue(shortBreakSlider, shortBreakValue);

            longBreakSlider.value = settings.longBreak;
            updateDisplayValue(longBreakSlider, longBreakValue);

            sessionsSlider.value = settings.sessionsBeforeLongBreak;
            updateDisplayValue(sessionsSlider, sessionsValue);

            autoStartAllCheckbox.checked = settings.autoStartAll;
        } catch (err) {
            console.error('Error loading settings from server:', err);
            // Optionally, fall back to default settings
            loadSettingsFromLocalStorage();
        }
    }

    // Function to load default settings
    function loadDefaultSettings() {
        // Set sliders to original default values
        workDurationSlider.value = DEFAULT_SETTINGS.workDuration;
        updateDisplayValue(workDurationSlider, workDurationValue);

        shortBreakSlider.value = DEFAULT_SETTINGS.shortBreak;
        updateDisplayValue(shortBreakSlider, shortBreakValue);

        longBreakSlider.value = DEFAULT_SETTINGS.longBreak;
        updateDisplayValue(longBreakSlider, longBreakValue);

        sessionsSlider.value = DEFAULT_SETTINGS.sessionsBeforeLongBreak;
        updateDisplayValue(sessionsSlider, sessionsValue);

        autoStartAllCheckbox.checked = DEFAULT_SETTINGS.autoStartAll;
    }

    // Function to load settings from localStorage
    function loadSettingsFromLocalStorage() {
        // Load settings from localStorage or use original defaults
        const settings = JSON.parse(localStorage.getItem('settings')) || { ...DEFAULT_SETTINGS };

        workDurationSlider.value = settings.workDuration;
        updateDisplayValue(workDurationSlider, workDurationValue);

        shortBreakSlider.value = settings.shortBreak;
        updateDisplayValue(shortBreakSlider, shortBreakValue);

        longBreakSlider.value = settings.longBreak;
        updateDisplayValue(longBreakSlider, longBreakValue);

        sessionsSlider.value = settings.sessionsBeforeLongBreak;
        updateDisplayValue(sessionsSlider, sessionsValue);

        autoStartAllCheckbox.checked = settings.autoStartAll;  // A single boolean
    }

    // Function to load settings based on login status
    async function loadSettingsBasedOnLogin() {
        const loggedIn = await isLoggedIn();
        if (loggedIn) {
            await loadSettingsFromServer();
        } else {
            loadSettingsFromLocalStorage();
        }
    }

    // Call the function to load settings
    await loadSettingsBasedOnLogin();

    // Handle form submission to save settings
    const settingsForm = document.getElementById('settings-form');
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent form from submitting traditionally

        // Gather settings from the form
        const settings = {
            workDuration: parseInt(workDurationSlider.value, 10),
            shortBreak: parseInt(shortBreakSlider.value, 10),
            longBreak: parseInt(longBreakSlider.value, 10),
            sessionsBeforeLongBreak: parseInt(sessionsSlider.value, 10),
            autoStartAll: autoStartAllCheckbox.checked,
        };

        const loggedIn = await isLoggedIn();

        if (loggedIn) {
            // Save settings to server via PUT /settings
            try {
                const res = await fetch('/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(settings),
                });
                if (!res.ok) throw new Error('Failed to save settings to server');
                const updatedSettings = await res.json();
                console.log('Settings saved to server:', updatedSettings);

                // Provide feedback to the user
                const message = document.createElement('div');
                message.textContent = 'Settings saved successfully!';
                message.style.color = 'green';
                message.style.marginTop = '10px';
                settingsForm.appendChild(message);

                // Dispatch 'settings-updated' event
                document.dispatchEvent(new Event('settings-updated'));

                // Close the modal
                settingsModal.classList.add('hidden');

                // Remove the message after 3 seconds
                setTimeout(() => {
                    message.remove();
                }, 3000);
            } catch (err) {
                console.error('Error saving settings to server:', err);
                // Provide error feedback
                const errorMessage = document.createElement('div');
                errorMessage.textContent = 'Error saving settings. Please try again.';
                errorMessage.style.color = 'red';
                errorMessage.style.marginTop = '10px';
                settingsForm.appendChild(errorMessage);

                // Remove the message after 3 seconds
                setTimeout(() => {
                    errorMessage.remove();
                }, 3000);
            }
        } else {
            // User is not logged in, save settings to localStorage
            try {
                localStorage.setItem('settings', JSON.stringify(settings));
                console.log('Settings saved to localStorage:', settings);

                // Provide feedback to the user
                const message = document.createElement('div');
                message.textContent = 'Settings saved locally!';
                message.style.color = 'green';
                message.style.marginTop = '10px';
                settingsForm.appendChild(message);

                // Dispatch 'settings-updated' event
                document.dispatchEvent(new Event('settings-updated'));

                // Close the modal
                settingsModal.classList.add('hidden');

                // Remove the message after 3 seconds
                setTimeout(() => {
                    message.remove();
                }, 3000);
            } catch (err) {
                console.error('Error saving settings to localStorage:', err);
                // Provide error feedback
                const errorMessage = document.createElement('div');
                errorMessage.textContent = 'Error saving settings locally. Please try again.';
                errorMessage.style.color = 'red';
                errorMessage.style.marginTop = '10px';
                settingsForm.appendChild(errorMessage);

                // Remove the message after 3 seconds
                setTimeout(() => {
                    errorMessage.remove();
                }, 3000);
            }
        }
    });

    // Handle Reset to Original Defaults
    resetDefaultBtn.addEventListener('click', async () => {
        const loggedIn = await isLoggedIn();
        if (loggedIn) {
            // Reset settings on the server (MongoDB)
            try {
                const originalDefaults = { ...DEFAULT_SETTINGS };

                const res = await fetch('/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(originalDefaults),
                });

                if (!res.ok) throw new Error('Failed to reset settings on server');
                const updatedSettings = await res.json();
                console.log('Settings reset to default on server:', updatedSettings);

                // Reload settings from server
                await loadSettingsFromServer();

                // Provide feedback to the user
                const message = document.createElement('div');
                message.textContent = 'Settings reset to original defaults!';
                message.style.color = 'green';
                message.style.marginTop = '10px';
                settingsForm.appendChild(message);

                // Dispatch 'settings-updated' event
                document.dispatchEvent(new Event('settings-updated'));

                // Close the modal
                settingsModal.classList.add('hidden');

                // Remove the message after 3 seconds
                setTimeout(() => {
                    message.remove();
                }, 3000);
            } catch (err) {
                console.error('Error resetting settings on server:', err);
                // Provide error feedback
                const errorMessage = document.createElement('div');
                errorMessage.textContent = 'Error resetting settings. Please try again.';
                errorMessage.style.color = 'red';
                errorMessage.style.marginTop = '10px';
                settingsForm.appendChild(errorMessage);

                // Remove the message after 3 seconds
                setTimeout(() => {
                    errorMessage.remove();
                }, 3000);
            }
        } else {
            // Reset settings in localStorage for unauthenticated users
            try {
                localStorage.removeItem('settings');
                loadSettingsFromLocalStorage();
                console.log('Settings reset to original defaults in localStorage');

                // Provide feedback to the user
                const message = document.createElement('div');
                message.textContent = 'Settings reset to original defaults!';
                message.style.color = 'green';
                message.style.marginTop = '10px';
                settingsForm.appendChild(message);

                // Dispatch 'settings-updated' event
                document.dispatchEvent(new Event('settings-updated'));

                // Close the modal
                settingsModal.classList.add('hidden');

                // Remove the message after 3 seconds
                setTimeout(() => {
                    message.remove();
                }, 3000);
            } catch (err) {
                console.error('Error resetting settings in localStorage:', err);
                // Provide error feedback
                const errorMessage = document.createElement('div');
                errorMessage.textContent = 'Error resetting settings. Please try again.';
                errorMessage.style.color = 'red';
                errorMessage.style.marginTop = '10px';
                settingsForm.appendChild(errorMessage);

                // Remove the message after 3 seconds
                setTimeout(() => {
                    errorMessage.remove();
                }, 3000);
            }
        }
    });

    // **Add Event Listeners for Opening and Closing the Settings Modal**

    // Get references to the settings button, close button, and modal
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');

    // Event listener to open the settings modal
    settingsBtn.addEventListener('click', async () => {
        settingsModal.classList.remove('hidden');
        await loadSettingsBasedOnLogin();
    });

    // Event listener to close the settings modal
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // Optionally, you can add an event listener to close the modal when clicking outside of it
    // For enhanced UX, but this is optional
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });
});

// **Remove or Comment Out the Following Block**
/*
document.getElementById('settings-btn').addEventListener('click', async () => {
    document.getElementById('settings-modal').classList.remove('hidden');
    await loadSettingsBasedOnLogin();
});
document.getElementById('close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
});

window.loadSettingsBasedOnLogin = loadSettingsBasedOnLogin;
*/

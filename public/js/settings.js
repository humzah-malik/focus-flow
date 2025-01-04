// Wait for the DOM to load completely before executing the script
document.addEventListener('DOMContentLoaded', function () {
    // Select the settings form element
    const settingsForm = document.getElementById('settings-form');
    // Select the "Auto-Start Next Session" checkbox input
    const autoStartInput = document.getElementById('auto-start');

    // Load the saved "auto-start" setting from localStorage and update the checkbox
    // If the saved value in localStorage is 'true', check the box; otherwise, leave it unchecked
    autoStartInput.checked = localStorage.getItem('auto-start') === 'true';

    // Add an event listener to handle the form submission
    settingsForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Prevent the form from refreshing the page when submitted

        // Save the values of the form fields into localStorage
        // Retrieve values from the form's input fields by their IDs and store them with corresponding keys
        localStorage.setItem('work-duration', document.getElementById('work-duration').value); // Work duration in minutes
        localStorage.setItem('short-break', document.getElementById('short-break').value);     // Short break duration in minutes
        localStorage.setItem('long-break', document.getElementById('long-break').value);       // Long break duration in minutes
        localStorage.setItem('sessions', document.getElementById('sessions').value);           // Number of sessions before a long break
        localStorage.setItem('auto-start', autoStartInput.checked);                            // Whether auto-start is enabled

        // Show a confirmation message to the user
        alert('Settings saved!');
    });
});
